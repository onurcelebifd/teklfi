'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { fetchExchangeRates } from '@/lib/helpers';

const BRAND_FILES: Record<string, string> = {
  guclumutfak: '/products-guclumutfak.json',
  mutpro: '/products-mutpro.json',
};

const PACKAGE_FILES: Record<string, string> = {
  guclumutfak: '/packages-guclumutfak.json',
  mutpro: '/packages-mutpro.json',
};

export default function ProductLoader() {
  const { products, setProducts, setRates, packages, setPackages } = useAppStore();
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
        const currentProducts = useAppStore.getState().products;
        // Manuel eklenen ürünleri koru (id'si auto- veya custom- ile başlayanlar)
        const manualProducts = currentProducts.filter(
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

    // Load packages for all brands
    const loadPackages = async () => {
      const jsonPackages: any[] = [];
      const seenIds = new Set<string>();
      for (const [brandId, file] of Object.entries(PACKAGE_FILES)) {
        try {
          const res = await fetch(file);
          if (!res.ok) continue;
          const data = await res.json();
          if (Array.isArray(data)) {
            // Deduplikasyon: mutpro ve guclumutfak aynı paketleri paylaşıyor
            const unique = data.filter((p: any) => {
              if (seenIds.has(p.id)) return false;
              seenIds.add(p.id);
              return true;
            });
            jsonPackages.push(...unique);
            console.log(`✅ ${unique.length} ${brandId} paketi yüklendi.`);
          }
        } catch (err) {
          console.warn(`${brandId} paketleri yüklenemedi:`, err);
        }
      }
      if (jsonPackages.length > 0) {
        const currentPackages = useAppStore.getState().packages;
        // JSON dosyası source of truth — JSON'daki paketleri güncelle, localStorage'daki ekstraları koru
        const jsonIds = new Set(jsonPackages.map((p) => p.id));
        const localOnlyPkgs = currentPackages.filter((p) => !jsonIds.has(p.id));
        setPackages([...jsonPackages, ...localOnlyPkgs]);
      }
    };

    loadAll();
    loadRates();
    loadPackages();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
