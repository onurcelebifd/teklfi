'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, Customer, Proposal, PackageTemplate, ProposalItem } from './types';

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

  // Proposals (local cache)
  proposals: Proposal[];
  setProposals: (proposals: Proposal[]) => void;
  addProposal: (proposal: Proposal) => void;
  updateProposal: (id: string, data: Partial<Proposal>) => void;
  removeProposal: (id: string) => void;

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
    (set) => ({
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
      addProposal: (proposal) => set((s) => ({ proposals: [proposal, ...s.proposals] })),
      updateProposal: (id, data) =>
        set((s) => ({
          proposals: s.proposals.map((p) => (p.id === id ? { ...p, ...data } : p)),
        })),
      removeProposal: (id) => set((s) => ({ proposals: s.proposals.filter((p) => p.id !== id) })),

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
