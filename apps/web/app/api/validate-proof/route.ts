import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Initialize Groq SDK
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { image, targetMinutes, elapsedMinutes, commitmentTitle, commitmentCategory, commitmentDescription } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    // 1. Hash the image for on-chain proof_hash
    const base64Data = image.split(',')[1] || image;
    const hash = crypto.createHash('sha256').update(base64Data).digest();
    const proofHash = Array.from(new Uint8Array(hash));
    const imageHashHex = hash.toString('hex'); // For Supabase checking

    // 2. Check duplicate hash in Supabase
    const { data: existingProof } = await supabaseAdmin
      .from('proof_hashes')
      .select('id')
      .eq('image_hash', imageHashHex)
      .single();

    if (existingProof) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rejected: This image has already been used for a proof. Please upload a new image.' 
      }, { status: 400 });
    }

    // 2. Build context-aware prompt
    const activityContext = commitmentTitle
      ? `The user's commitment is: "${commitmentTitle}" (Category: ${commitmentCategory || 'Other'}).${commitmentDescription ? ` Description: "${commitmentDescription}".` : ''}`
      : 'No specific commitment context provided.';

    const prompt = `
      You are an AI Auditor for Atomx Protocol, a habit-building platform where users stake real money on their commitments.
      Your job is to verify if the uploaded image is a legitimate proof of activity completion.

      === COMMITMENT CONTEXT ===
      ${activityContext}
      Daily target: ${targetMinutes || 0} minutes.

      === YOUR TASK ===
      1. Does the image show an activity that is RELEVANT to the commitment title/description above?
      2. If category type is 'fitness' or 'workout' then check, Is there a visible timer, stopwatch, app dashboard, or any indicator showing duration/progress?
      3. Rate your CONFIDENCE (0-100) that this is a genuine, valid proof:
         - 0-29: Very suspicious (stock photo, unrelated content, no timer, clearly fake)
         - 30-59: Somewhat confident (related activity but weak evidence)
         - 60-79: Confident (clear activity match with some duration evidence)
         - 80-100: Very confident (perfect match with clear timer/duration visible)
      4. Is the image a generic stock photo, AI-generated, or a screenshot of a website (not allowed)?

      === SCORING RULES ===
      - If the image has NO relation to the commitment title → score below 20
      - If there's no visible timer/duration indicator → cap score at 50
      - If the activity matches AND timer is visible → score 60+
      - Stock photos or clearly fake images → score 0-10

      Output MUST be valid JSON matching this exact structure:
      {
        "isValid": true/false,
        "confidenceScore": number (0-100),
        "activity": "string describing detected activity",
        "relevance": "string explaining how the image relates to the commitment",
        "reason": "short explanation of the score"
      }

      Set isValid to TRUE only if confidenceScore >= 30.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: image }
            }
          ]
        }
      ],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const aiResponseText = chatCompletion.choices[0]?.message?.content || '{}';
    console.log('Groq Raw Response:', aiResponseText);

    const aiResult = JSON.parse(aiResponseText);

    // Enforce confidence threshold server-side (safety net)
    const confidenceScore = aiResult.confidenceScore ?? 0;
    if (confidenceScore < 30) {
      aiResult.isValid = false;
    }

    return NextResponse.json({
      success: true,
      aiResult,
      proofHash,
      actualMinutes: elapsedMinutes || 0
    });
  } catch (error: any) {
    console.error('Validation Error (Groq):', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
