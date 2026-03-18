'use client';

import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getBrand } from '@/lib/brands';
import { Search, Trash2, Clock, CheckCircle, XCircle, Eye, Send } from 'lucide-react';
import { useState } from 'react';
import type { ProposalStatus } from '@/lib/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types';
import Link from 'next/link';

export default function TekliflerPage() {
  const params = useParams();
  const brandId = params.brand as string;
  const brand = getBrand(brandId);
  const { proposals, updateProposal, removeProposal } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const brandProposals = proposals
    .filter((p) => p.brand_id === brandId)
    .filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        (p.project_name || '').toLowerCase().includes(s) ||
        (p.customer_name || '').toLowerCase().includes(s) ||
        (p.proposal_no || '').toLowerCase().includes(s)
      );
    });

  const handleDelete = (id: string) => {
    if (confirm('Bu teklifi silmek istediğinize emin misiniz?')) {
      removeProposal(id);
    }
  };

  const handleStatusChange = (id: string, status: ProposalStatus) => {
    updateProposal(id, { status });
  };

  const statuses: { value: string; label: string }[] = [
    { value: 'all', label: 'Tümü' },
    { value: 'draft', label: 'Taslak' },
    { value: 'sent', label: 'Gönderildi' },
    { value: 'viewed', label: 'Görüntülendi' },
    { value: 'approved', label: 'Onaylandı' },
    { value: 'rejected', label: 'Reddedildi' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teklif Geçmişi</h1>
        <p className="text-sm text-gray-500 mt-1">{brand.fullName} - Tüm teklifleri yönetin</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Proje adı, müşteri veya teklif no ara..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                statusFilter === s.value
                  ? `${brand.bgColor} ${brand.textColor} ${brand.borderColor}`
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Proposals List */}
      {brandProposals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Henüz teklif bulunamadı</p>
          <p className="text-sm mt-1">Yeni teklif oluşturarak başlayabilirsiniz</p>
          <Link href={`/${brandId}/teklif/yeni`} className={`inline-block mt-4 px-4 py-2 rounded-lg text-white text-sm font-bold ${brand.id === 'mutpro' ? 'bg-[#040023]' : 'bg-red-600'}`}>
            Yeni Teklif Oluştur
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {brandProposals.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-bold text-gray-900 truncate">{p.project_name || 'İsimsiz Proje'}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium text-gray-700">{p.customer_name || 'Müşteri Yok'}</span>
                    <span className="mx-2">•</span>
                    <span>{p.proposal_no}</span>
                    <span className="mx-2">•</span>
                    <span>{p.proposal_date}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-lg font-extrabold text-gray-900 whitespace-nowrap">
                    ₺{p.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>

                  {/* Status Actions */}
                  <div className="flex gap-1">
                    <button onClick={() => handleStatusChange(p.id, 'sent')} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition" title="Gönderildi"><Send className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleStatusChange(p.id, 'viewed')} className="p-1.5 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition" title="Görüntülendi"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleStatusChange(p.id, 'approved')} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition" title="Onaylandı"><CheckCircle className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleStatusChange(p.id, 'rejected')} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition" title="Reddedildi"><XCircle className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition" title="Sil"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
