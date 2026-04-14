'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { fetchExchangeRates } from '@/lib/helpers';

const BRAND_FILES: Record<string, string> = {
  guclumutfak: '/products-guclumutfak.json',
  mutpro: '/products-mutpro.json',
};

export default function ProductLoader() {
  const { products, setProducts, setRates } = useAppStore();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    // Load products for all brands
    const loadAll = async () => {
      const jsonProducts: any[] = [];
      for (const [brandId, file] of Object.entries(BRAND_FILES)) {
        try {
          const res = await fetch(file);
          if (!res.ok) continue;
          const data = await res.json();
          if (Array.isArray(data)) {
            jsonProducts.push(...data);
            console.log(`✅ ${data.length} ${brandId} ürünü yüklendi.`);
          }
        } catch (err) {
          console.warn(`${brandId} ürünleri yüklenemedi:`, err);
        }
      }
      if (jsonProducts.length > 0) {
        // Manuel eklenen ürünleri koru (id'si auto- veya custom- ile başlayanlar)
        const manualProducts = products.filter(
          (p) => p.id.startsWith('auto-') || p.id.startsWith('custom-') || !jsonProducts.some((jp) => jp.id === p.id)
        );
        // JSON ürünlerini + manuel ürünleri birleştir
        const jsonIds = new Set(jsonProducts.map((p) => p.id));
        const uniqueManual = manualProducts.filter((p) => !jsonIds.has(p.id));
        setProducts([...jsonProducts, ...uniqueManual]);
      }
    };

    // Load exchange rates from TCMB
    const loadRates = async () => {
      try {
        const rates = await fetchExchangeRates();
        setRates(rates);
        console.log(`✅ Döviz kurları yüklendi: €1 = ₺${rates.eur}`);
      } catch (err) {
        console.warn('Döviz kurları yüklenemedi:', err);
      }
    };

    loadAll();
    loadRates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
