import { NextResponse } from 'next/server';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbz-oiGAdth3XigHSRqLwR3fSgGhSXenfzE99JgnpOw84SEH0qqTCKa8IZN9aMRiMh2pVQ/exec';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('>>> [Leaderboard] Sending to GAS:', body);
    
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'follow'
    });

    console.log('>>> [Leaderboard] GAS Status:', response.status);
    
    const text = await response.text();
    // HTML 로그인 페이지가 오는지 확인하여 방어
    if (text.startsWith('<!DOCTYPE html>') || text.includes('<html')) {
      console.error('!!! [Leaderboard] GAS returned HTML instead of JSON. Check GAS Deployment permissions.');
      return NextResponse.json({ success: false, error: 'GAS returned HTML. Permissions issue?' }, { status: 500 });
    }

    console.log('>>> [Leaderboard] GAS Response Body:', text);

    return new Response(text, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('!!! [Leaderboard] Critical Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log('>>> [Leaderboard] Fetching Top 3 from GAS...');
    const response = await fetch(GAS_URL, { redirect: 'follow' });
    const text = await response.text();
    
    if (text.startsWith('<!DOCTYPE html>') || text.includes('<html')) {
      console.error('!!! [Leaderboard] GET GAS returned HTML. Check permissions.');
      return NextResponse.json({ success: false, top3: [], error: 'GAS permissions issue' }, { status: 500 });
    }

    console.log('>>> [Leaderboard] Top 3 Body:', text);
    
    return new Response(text, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('!!! [Leaderboard] GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

