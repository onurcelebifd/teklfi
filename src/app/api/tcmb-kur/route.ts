import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // TCMB günlük döviz kurları XML
    const res = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', {
      next: { revalidate: 3600 }, // 1 saat cache
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!res.ok) throw new Error(`TCMB API error: ${res.status}`);

    const xml = await res.text();

    // USD döviz alış kuru
    const usdMatch = xml.match(/<Currency[^>]*Kod="USD"[^>]*>[\s\S]*?<ForexBuying>([\d.,]+)<\/ForexBuying>/);
    const usdSelling = xml.match(/<Currency[^>]*Kod="USD"[^>]*>[\s\S]*?<ForexSelling>([\d.,]+)<\/ForexSelling>/);

    // EUR döviz alış kuru
    const eurMatch = xml.match(/<Currency[^>]*Kod="EUR"[^>]*>[\s\S]*?<ForexBuying>([\d.,]+)<\/ForexBuying>/);
    const eurSelling = xml.match(/<Currency[^>]*Kod="EUR"[^>]*>[\s\S]*?<ForexSelling>([\d.,]+)<\/ForexSelling>/);

    // GBP döviz alış kuru
    const gbpMatch = xml.match(/<Currency[^>]*Kod="GBP"[^>]*>[\s\S]*?<ForexBuying>([\d.,]+)<\/ForexBuying>/);
    const gbpSelling = xml.match(/<Currency[^>]*Kod="GBP"[^>]*>[\s\S]*?<ForexSelling>([\d.,]+)<\/ForexSelling>/);

    const parseRate = (match: RegExpMatchArray | null): number => {
      if (!match || !match[1]) return 0;
      return parseFloat(match[1].replace(',', '.'));
    };

    const rates = {
      usd: parseRate(usdSelling) || parseRate(usdMatch) || 38,
      eur: parseRate(eurSelling) || parseRate(eurMatch) || 41,
      gbp: parseRate(gbpSelling) || parseRate(gbpMatch) || 48,
      usd_buying: parseRate(usdMatch) || 38,
      eur_buying: parseRate(eurMatch) || 41,
      gbp_buying: parseRate(gbpMatch) || 48,
      source: 'TCMB',
      date: new Date().toLocaleDateString('tr-TR'),
    };

    return NextResponse.json(rates);
  } catch (error) {
    // Fallback değerler
    return NextResponse.json({
      usd: 38,
      eur: 41,
      gbp: 48,
      usd_buying: 37.8,
      eur_buying: 40.8,
      gbp_buying: 47.5,
      source: 'Fallback',
      date: new Date().toLocaleDateString('tr-TR'),
    });
  }
}
