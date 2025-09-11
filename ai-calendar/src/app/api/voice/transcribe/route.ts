import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { audio } = await request.json();

    // For demonstration, we'll simulate transcription
    // In production, this would use OpenAI Whisper API
    
    // Extract base64 data
    const base64Data = audio.split(',')[1] || audio;
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock transcription responses
    const mockTranscriptions = [
      "What's on my calendar today?",
      "Schedule a meeting with John tomorrow at 3pm",
      "Cancel my 2pm appointment",
      "Move my dentist appointment to next week",
      "Show me tomorrow's schedule",
    ];
    
    // Return a random mock transcription
    const transcribedText = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
    
    return NextResponse.json({
      text: transcribedText,
      confidence: 0.95,
    });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}

// For production implementation with OpenAI Whisper:
/*
export async function POST(request: NextRequest) {
  try {
    const { audio } = await request.json();
    
    // Convert base64 to blob
    const base64Data = audio.split(',')[1];
    const binaryData = Buffer.from(base64Data, 'base64');
    
    // Create form data for Whisper API
    const formData = new FormData();
    const audioBlob = new Blob([binaryData], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    
    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Whisper API error');
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      text: data.text,
      confidence: 1.0,
    });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
*/