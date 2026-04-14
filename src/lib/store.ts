'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, Customer, Proposal, PackageTemplate, ProposalItem } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

interface AppState {
  currentBrand: string;
  setCurrentBrand: (brand: string) => void;

  // Products (local cache)
  products: Product[];
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  removeProduct: (id: string) => void;

  // Customers (local cache)
  customers: Customer[];
  setCustomers: (customers: Customer[]) => void;
  addCustomer: (customer: Customer) => void;
  removeCustomer: (id: string) => void;

  // Proposals (synced with Supabase)
  proposals: Proposal[];
  setProposals: (proposals: Proposal[]) => void;
  addProposal: (proposal: Proposal) => void;
  updateProposal: (id: string, data: Partial<Proposal>) => void;
  removeProposal: (id: string) => void;
  fetchProposals: () => Promise<void>;

  // Packages (local cache)
  packages: PackageTemplate[];
  setPackages: (packages: PackageTemplate[]) => void;
  addPackage: (pkg: PackageTemplate) => void;
  removePackage: (id: string) => void;

  // Current proposal being edited
  currentItems: ProposalItem[];
  setCurrentItems: (items: ProposalItem[]) => void;
  addCurrentItem: (item: ProposalItem) => void;
  removeCurrentItem: (id: string) => void;
  updateCurrentItem: (id: string, data: Partial<ProposalItem>) => void;

  // Exchange rates
  rates: { usd: number; eur: number; gbp: number };
  setRates: (rates: { usd: number; eur: number; gbp: number }) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentBrand: '',
      setCurrentBrand: (brand) => set({ currentBrand: brand }),

      products: [],
      setProducts: (products) => set({ products }),
      addProduct: (product) => set((s) => ({ products: [...s.products, product] })),
      removeProduct: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id) })),

      customers: [],
      setCustomers: (customers) => set({ customers }),
      addCustomer: (customer) => set((s) => ({ customers: [...s.customers, customer] })),
      removeCustomer: (id) => set((s) => ({ customers: s.customers.filter((c) => c.id !== id) })),

      proposals: [],
      setProposals: (proposals) => set({ proposals }),

      addProposal: (proposal) => {
        set((s) => ({ proposals: [proposal, ...s.proposals] }));
        if (isSupabaseConfigured()) {
          supabase.from('proposals').upsert({
            id: proposal.id,
            brand_id: proposal.brand_id,
            proposal_no: proposal.proposal_no,
            proposal_date: proposal.proposal_date,
            project_name: proposal.project_name,
            customer_name: proposal.customer_name,
            customer_phone: proposal.customer_phone,
            customer_city: proposal.customer_city,
            customer_address: proposal.customer_address,
            prepared_by: proposal.prepared_by,
            items: proposal.items,
            discount_value: proposal.discount_value,
            currency: proposal.currency,
            include_vat: proposal.include_vat,
            conditions: proposal.conditions,
            global_hide_prices: proposal.global_hide_prices,
            status: proposal.status,
            total: proposal.total,
          }).then(({ error }) => {
            if (error) console.error('Supabase addProposal error:', error);
          });
        }
      },

      updateProposal: (id, data) => {
        set((s) => ({
          proposals: s.proposals.map((p) => (p.id === id ? { ...p, ...data } : p)),
        }));
        if (isSupabaseConfigured()) {
          supabase.from('proposals').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
            if (error) console.error('Supabase updateProposal error:', error);
          });
        }
      },

      removeProposal: (id) => {
        set((s) => ({ proposals: s.proposals.filter((p) => p.id !== id) }));
        if (isSupabaseConfigured()) {
          supabase.from('proposals').delete().eq('id', id).then(({ error }) => {
            if (error) console.error('Supabase removeProposal error:', error);
          });
        }
      },

      fetchProposals: async () => {
        if (!isSupabaseConfigured()) return;
        const { data, error } = await supabase
          .from('proposals')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Supabase fetchProposals error:', error);
          return;
        }
        if (data) {
          const supabaseProposals: Proposal[] = data.map((row: any) => ({
            id: row.id,
            brand_id: row.brand_id,
            proposal_no: row.proposal_no || '',
            proposal_date: row.proposal_date || '',
            project_name: row.project_name || '',
            customer_name: row.customer_name || '',
            customer_phone: row.customer_phone || '',
            customer_city: row.customer_city || '',
            customer_address: row.customer_address || '',
            prepared_by: row.prepared_by || '',
            items: row.items || [],
            discount_value: row.discount_value || 0,
            currency: row.currency || 'TRY',
            include_vat: row.include_vat ?? true,
            conditions: row.conditions || '',
            global_hide_prices: row.global_hide_prices || false,
            status: row.status || 'draft',
            total: row.total || 0,
          }));
          // Local teklifleri koru: Supabase'de olmayan local teklifleri birleştir
          const supabaseIds = new Set(supabaseProposals.map((p) => p.id));
          const localOnly = get().proposals.filter((p) => !supabaseIds.has(p.id));
          set({ proposals: [...supabaseProposals, ...localOnly] });
        }
      },

      packages: [],
      setPackages: (packages) => set({ packages }),
      addPackage: (pkg) => set((s) => ({ packages: [...s.packages, pkg] })),
      removePackage: (id) => set((s) => ({ packages: s.packages.filter((p) => p.id !== id) })),

      currentItems: [],
      setCurrentItems: (items) => set({ currentItems: items }),
      addCurrentItem: (item) => set((s) => ({ currentItems: [...s.currentItems, item] })),
      removeCurrentItem: (id) => set((s) => ({ currentItems: s.currentItems.filter((i) => i.id !== id) })),
      updateCurrentItem: (id, data) =>
        set((s) => ({
          currentItems: s.currentItems.map((i) => (i.id === id ? { ...i, ...data } : i)),
        })),

      rates: { usd: 38, eur: 41, gbp: 48 },
      setRates: (rates) => set({ rates }),
    }),
    {
      name: 'teklif-yonetim-store',
      partialize: (state) => ({
        currentBrand: state.currentBrand,
        customers: state.customers,
        proposals: state.proposals,
        packages: state.packages,
        rates: state.rates,
      }),
    }
  )
);
