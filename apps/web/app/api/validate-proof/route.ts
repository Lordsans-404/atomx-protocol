import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import crypto from 'crypto';

// Initialize Groq SDK
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { image, targetMinutes } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    // 1. Hash the image for on-chain proof_hash
    const base64Data = image.split(',')[1] || image;
    const hash = crypto.createHash('sha256').update(base64Data).digest();
    const proofHash = Array.from(new Uint8Array(hash));

    // 2. Call Groq Vision API
    const prompt = `
      You are an AI Auditor for Atomx Protocol, a habit-building platform. 
      Your task is to verify if the provided image is a valid proof of an activity (workout, study, etc.).
      
      Requirements:
      1. Identify the activity shown in the image.
      2. Locate a timer, stopwatch, app dashboard, or clock that shows duration.
      3. Extract the total duration in MINUTES. If shown in hours/seconds, convert to minutes.
      4. Detect if the image is a generic stock photo, a screenshot of a website (not allowed), or a valid live photo.
      
      Target: User needs to achieve at least ${targetMinutes || 0} minutes.
      
      Output MUST be valid JSON matching this exact structure:
      {
        "isValid": true/false,
        "minutes": number,
        "activity": "string",
        "reason": "short explanation"
      }
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: image } // Groq accepts the full data:image/jpeg;base64,... URI
            }
          ]
        }
      ],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      response_format: { type: 'json_object' },
      temperature: 0.2, // Keep it deterministic
    });

    const aiResponseText = chatCompletion.choices[0]?.message?.content || '{}';
    console.log('Groq Raw Response:', aiResponseText);

    // Because we used response_format: { type: "json_object" }, it's guaranteed to parse
    const aiResult = JSON.parse(aiResponseText);

    return NextResponse.json({
      success: true,
      aiResult,
      proofHash,
      actualMinutes: aiResult.minutes || 0
    });
  } catch (error: any) {
    console.error('Validation Error (Groq):', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
