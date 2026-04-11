'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { getBrand } from '@/lib/brands';
import { formatCurrency, getCurrencySymbol, numberToText, generateProposalNo, getTodayDate, getValidityDate, getValidityText } from '@/lib/helpers';
import type { ProposalItem, Proposal } from '@/lib/types';
import {
  Plus, Trash2, Copy, GripVertical, Eye, EyeOff, Truck, Save, FileDown,
  Printer, ArrowLeft, Search, Users, ChevronDown, RefreshCw, Package, UserCheck, AlertCircle
} from 'lucide-react';

export default function YeniTeklifPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brand as string;
  const brand = getBrand(brandId);
  const { products, customers, addProposal, addProduct, rates } = useAppStore();
  const printRef = useRef<HTMLDivElement>(null);

  // Editable exchange rate (TCMB'den gelir, kullanıcı değiştirebilir)
  const [eurRate, setEurRate] = useState(rates.eur || 41);
  const [usdRate, setUsdRate] = useState(rates.usd || 38);
  const [gbpRate, setGbpRate] = useState(rates.gbp || 48);

  // Sync rates from store when they update
  useEffect(() => {
    if (rates.eur > 0) setEurRate(rates.eur);
    if (rates.usd > 0) setUsdRate(rates.usd);
    if (rates.gbp > 0) setGbpRate(rates.gbp);
  }, [rates]);

  const brandProducts = products.filter((p) => p.brand_id === brandId);
  const brandCustomers = customers.filter((c) => c.brand_id === brandId);

  const [proposalNo] = useState(generateProposalNo(brandId));
  const [proposalDate] = useState(getTodayDate());
  const [projectName, setProjectName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [currency, setCurrency] = useState('TRY');
  const [inputCurrency] = useState('EUR'); // Ürünler EUR bazlı gelir
  const [discountValue, setDiscountValue] = useState(0);
  const [includeVAT] = useState(true); // KDV her zaman dahil mantığı
  const [globalHidePrices, setGlobalHidePrices] = useState(false);
  const [preparedBy, setPreparedBy] = useState('');
  const [conditions, setConditions] = useState(
    `• ${getValidityText()}\n• Ödeme: Sipariş ile birlikte.\n• Teslimat: Stok durumuna göre 1-4 hafta.\n• Fiyatlara KDV dahil değildir.\n• Nakliye alıcıya aittir.`
  );
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  // New item form
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', cost: '', quantity: '1', image: '', product_link: '' });

  // New product form (kataloga kaydetme)
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', category: '', price: '', cost: '', image: '', product_link: '' });

  // Livesearch state for product name input
  const [nameSuggestions, setNameSuggestions] = useState<typeof brandProducts>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const addItem = useCallback((item?: Partial<ProposalItem>) => {
    const newEntry: ProposalItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: item?.name || newItem.name || '',
      description: item?.description || newItem.description || '',
      price: item?.price || parseFloat(newItem.price) || 0,
      cost: item?.cost || parseFloat(newItem.cost) || 0,
      quantity: item?.quantity || parseInt(newItem.quantity) || 1,
      image: item?.image || newItem.image || '',
      product_link: item?.product_link || newItem.product_link || '',
      item_discount: item?.item_discount || 0,
      total: 0,
      input_currency: currency,
      exchange_rate: 1,
      hide_price: false,
      shipped: false,
    };
    if (!newEntry.name) return;
    newEntry.total = newEntry.price * (1 - newEntry.item_discount / 100) * newEntry.quantity;
    setItems((prev) => [...prev, newEntry]);
    setNewItem({ name: '', description: '', price: '', cost: '', quantity: '1', image: '', product_link: '' });
  }, [newItem, currency]);

  const updateItem = (id: string, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (['price', 'quantity', 'item_discount'].includes(field)) {
          const p = field === 'price' ? parseFloat(value) || 0 : updated.price;
          const q = field === 'quantity' ? parseInt(value) || 1 : updated.quantity;
          const d = field === 'item_discount' ? parseFloat(value) || 0 : updated.item_discount;
          updated.total = p * (1 - d / 100) * q;
        }
        return updated;
      })
    );
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const duplicateItem = (index: number) => {
    const item = items[index];
    const dup = { ...item, id: Date.now().toString() + Math.random().toString(36).substr(2, 5) };
    setItems((prev) => [...prev.slice(0, index + 1), dup, ...prev.slice(index + 1)]);
  };

  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
  const handleDrop = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const copy = [...items];
    const dragged = copy.splice(dragItem.current, 1)[0];
    copy.splice(dragOverItem.current, 0, dragged);
    setItems(copy);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // EUR -> TRY dönüşümü: Ürünler EUR bazlı, teklif TL bazlı
  const eurToTry = (amount: number) => Math.round(amount * eurRate * 100) / 100;

  const addFromProduct = (p: any) => {
    const priceInTry = eurToTry(p.price);
    const costInTry = eurToTry(p.cost || 0);
    addItem({ name: p.name, description: '', price: priceInTry, cost: costInTry, image: p.image, product_link: p.product_link, quantity: 1 });
    setShowProductSearch(false);
    setProductSearch('');
    setShowNameSuggestions(false);
    setNameSuggestions([]);
    setNewItem({ name: '', description: '', price: '', cost: '', quantity: '1', image: '', product_link: '' });
  };

  const handleNameInput = (value: string) => {
    setNewItem({ ...newItem, name: value });
    if (value.length >= 2 && brandProducts.length > 0) {
      const q = value.toLowerCase();
      const matches = brandProducts.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const mfrMatch = ((p as any).manufacturer || '').toLowerCase().includes(q);
        const skuMatch = ((p as any).sku || '').toLowerCase().includes(q);
        const catMatch = (p.category || '').toLowerCase().includes(q);
        return nameMatch || mfrMatch || skuMatch || catMatch;
      }).slice(0, 15);
      setNameSuggestions(matches);
      setShowNameSuggestions(matches.length > 0);
    } else {
      setNameSuggestions([]);
      setShowNameSuggestions(false);
    }
  };

  const selectSuggestion = (p: any) => {
    const priceInTry = eurToTry(p.price);
    const costInTry = eurToTry(p.cost || 0);
    addItem({ name: p.name, description: '', price: priceInTry, cost: costInTry, image: p.image, product_link: p.product_link, quantity: 1 });
    setShowNameSuggestions(false);
    setNameSuggestions([]);
    setNewItem({ name: '', description: '', price: '', cost: '', quantity: '1', image: '', product_link: '' });
  };

  const selectCustomer = (c: any) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerCity(c.city);
    setCustomerAddress(c.address);
    setShowCustomerPicker(false);
  };

  // Yeni ürün oluştur ve kataloga kaydet
  const saveNewProduct = () => {
    if (!newProduct.name.trim()) return alert('Ürün adı zorunludur');
    const price = parseFloat(newProduct.price) || 0;
    const cost = parseFloat(newProduct.cost) || 0;
    const product = {
      id: `custom-${Date.now()}`,
      brand_id: brandId,
      name: newProduct.name.trim(),
      description: '',
      price,
      cost,
      image: newProduct.image.trim(),
      product_link: newProduct.product_link.trim(),
      category: newProduct.category.trim(),
      currency: 'EUR',
    };
    addProduct(product);
    // Aynı zamanda teklife de ekle (EUR -> TRY dönüşümü ile)
    const priceInTry = eurToTry(price);
    const costInTry = eurToTry(cost);
    addItem({ name: product.name, description: '', price: priceInTry, cost: costInTry, image: product.image, product_link: product.product_link, quantity: 1 });
    setNewProduct({ name: '', category: '', price: '', cost: '', image: '', product_link: '' });
    setShowNewProductForm(false);
  };

  // Calculations — Girilen fiyatlar KDV dahil, /1.20 ile KDV hariç bulunur
  const KDV_RATE = 0.20;
  // items.total zaten brüt (KDV dahil) fiyat x adet
  const brutTotal = items.reduce((sum, i) => sum + i.total, 0); // KDV dahil toplam
  const subTotal = brutTotal / (1 + KDV_RATE); // KDV hariç ara toplam
  const discountedSubTotal = subTotal - discountValue;
  const kdvTotal = discountedSubTotal * KDV_RATE;
  const finalTotal = discountedSubTotal + kdvTotal; // Genel Toplam (KDV dahil)
  const totalCost = items.reduce((sum, i) => sum + i.cost * i.quantity, 0);
  const netProfit = discountedSubTotal - totalCost;
  const profitMargin = discountedSubTotal > 0 ? (netProfit / discountedSubTotal) * 100 : 0;
  const sym = getCurrencySymbol(currency);

  const convertCurrency = (amount: number) => {
    if (currency === 'TRY') return amount;
    if (currency === 'USD') return amount / rates.usd;
    if (currency === 'EUR') return amount / rates.eur;
    if (currency === 'GBP') return amount / rates.gbp;
    return amount;
  };

  const isFormValid = preparedBy.trim().length > 0;

  const handleSave = () => {
    if (!isFormValid) return alert('Teklifi Hazırlayan alanı zorunludur!');
    const proposal: Proposal = {
      id: Date.now().toString(),
      brand_id: brandId,
      proposal_no: proposalNo,
      proposal_date: proposalDate,
      project_name: projectName,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_city: customerCity,
      customer_address: customerAddress,
      prepared_by: preparedBy.trim(),
      items,
      discount_value: discountValue,
      currency,
      include_vat: includeVAT,
      conditions,
      global_hide_prices: globalHidePrices,
      status: 'draft',
      total: finalTotal,
    };
    addProposal(proposal);
    alert('Teklif başarıyla kaydedildi!');
    router.push(`/${brandId}/teklifler`);
  };

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    if (!isFormValid) return alert('PDF oluşturmak için "Teklifi Hazırlayan" alanı zorunludur!');
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: [5, 5, 10, 5],
        filename: `${proposalNo}_${projectName || 'Teklif'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };
      await html2pdf().set(opt).from(printRef.current).save();

      // PDF indirildiğinde otomatik olarak geçmişe kaydet
      const proposal: Proposal = {
        id: Date.now().toString(),
        brand_id: brandId,
        proposal_no: proposalNo,
        proposal_date: proposalDate,
        project_name: projectName,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_city: customerCity,
        customer_address: customerAddress,
        prepared_by: preparedBy.trim(),
        items,
        discount_value: discountValue,
        currency,
        include_vat: includeVAT,
        conditions,
        global_hide_prices: globalHidePrices,
        status: 'sent',
        total: finalTotal,
      };
      addProposal(proposal);
    } catch {
      alert('PDF oluşturulurken hata oluştu.');
    }
  };

  const filteredProducts = brandProducts.filter((p) => {
    if (!productSearch) return true;
    return p.name.toLowerCase().includes(productSearch.toLowerCase());
  });

  if (isPrintMode) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="no-print flex items-center gap-3 mb-4 p-3 bg-white rounded-xl border shadow-sm">
          <button onClick={() => setIsPrintMode(false)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"><ArrowLeft className="w-4 h-4" /> Düzenlemeye Dön</button>
          <div className="flex-1" />
          <button onClick={handlePrint} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Printer className="w-4 h-4" /> Yazdır</button>
          <button onClick={handleDownloadPDF} disabled={!isFormValid} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${isFormValid ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}><FileDown className="w-4 h-4" /> PDF İndir</button>
          <button onClick={handleSave} disabled={!isFormValid} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${isFormValid ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}><Save className="w-4 h-4" /> Kaydet</button>
          {!isFormValid && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Hazırlayan alanını doldurun</span>}
        </div>

        <div ref={printRef} className="bg-white p-6 rounded-xl shadow-lg page-container">
          {/* Header */}
          <div className={`flex justify-between items-start mb-6 pb-4 border-b-2 ${brand.id === 'mutpro' ? 'border-[#040023]' : 'border-red-600'}`}>
            <div>
              <img src={brand.logo} alt={brand.name} className="h-10 object-contain mb-1" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="text-[10px] text-gray-500 space-y-0.5 mt-1 leading-tight">
                {brand.address.map((line, i) => <div key={i}>{line}</div>)}
                <div>{brand.phone} • {brand.email}</div>
              </div>
            </div>
            <div className="text-right">
              <h1 className={`text-lg font-extrabold ${brand.id === 'mutpro' ? 'text-[#040023]' : 'text-red-600'} mb-1`}>FİYAT TEKLİFİ</h1>
              <div className="text-xs space-y-0.5 text-gray-600">
                <div><span className="font-bold">Teklif No:</span> {proposalNo}</div>
                <div><span className="font-bold">Tarih:</span> {proposalDate}</div>
                <div><span className="font-bold">Geçerlilik:</span> {getValidityDate()}</div>
              </div>
            </div>
          </div>

          {/* Customer + Project */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Müşteri Bilgileri</h3>
              <div className="text-sm font-bold text-gray-900">{customerName || '-'}</div>
              {customerPhone && <div className="text-xs text-gray-600">{customerPhone}</div>}
              {customerCity && <div className="text-xs text-gray-600">{customerCity}</div>}
              {customerAddress && <div className="text-xs text-gray-500 mt-1">{customerAddress}</div>}
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Proje</h3>
              <div className="text-sm font-bold text-gray-900">{projectName || '-'}</div>
            </div>
          </div>

          {/* Items Table — Birim fiyatlar KDV hariç gösterilir */}
          {items.length > 0 && (
            <table className="w-full text-sm mb-8">
              <thead>
                <tr className={`${brand.id === 'mutpro' ? 'bg-[#040023]' : 'bg-red-600'} text-white text-xs`}>
                  <th className="py-2 px-2 text-center w-10">#</th>
                  {!isCompactMode && <th className="py-2 px-2 w-20">Görsel</th>}
                  <th className="py-2 px-2 text-left">Ürün</th>
                  <th className="py-2 px-2 text-center w-14">Adet</th>
                  {!globalHidePrices && <th className="py-2 px-2 text-right w-28">Birim Fiyat (KDV Hariç)</th>}
                  {!globalHidePrices && <th className="py-2 px-2 text-right w-28">Toplam (KDV Hariç)</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const brutUnitPrice = item.price * (1 - item.item_discount / 100);
                  const netUnitPrice = brutUnitPrice / (1 + KDV_RATE);
                  const netLineTotal = item.total / (1 + KDV_RATE);
                  const isHidden = globalHidePrices || item.hide_price;
                  return (
                    <tr key={item.id} className={`border-b border-gray-100 ${item.shipped ? 'line-through opacity-50' : ''}`}>
                      <td className="py-3 px-2 text-center text-gray-500 font-medium">{idx + 1}</td>
                      {!isCompactMode && (
                        <td className="py-2 px-2">
                          <div className="w-12 h-12 border rounded bg-white overflow-hidden">
                            {item.image ? <img src={item.image} className="w-full h-full object-contain" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <div className="w-full h-full bg-gray-100" />}
                          </div>
                        </td>
                      )}
                      <td className="py-3 px-2">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.description && <div className="text-xs text-gray-500 italic mt-0.5">{item.description}</div>}
                      </td>
                      <td className="py-3 px-2 text-center font-semibold">{item.quantity}</td>
                      {!isHidden && <td className="py-3 px-2 text-right font-bold">{formatCurrency(netUnitPrice, sym)}</td>}
                      {!isHidden && <td className="py-3 px-2 text-right font-bold">{formatCurrency(netLineTotal, sym)}</td>}
                      {isHidden && !globalHidePrices && <td className="py-3 px-2 text-center text-gray-400">-</td>}
                      {isHidden && !globalHidePrices && <td className="py-3 px-2 text-center text-gray-400">-</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Totals — KDV hariç ara toplam + KDV satırı + Genel Toplam */}
          {!globalHidePrices && (
            <div className="flex justify-end mb-8">
              <div className="w-80 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Ara Toplam (KDV Hariç):</span><span className="font-semibold">{formatCurrency(subTotal, sym)}</span></div>
                {discountValue > 0 && <div className="flex justify-between text-red-600"><span>İndirim:</span><span>-{formatCurrency(discountValue, sym)}</span></div>}
                {discountValue > 0 && <div className="flex justify-between border-t pt-1"><span className="text-gray-600">İndirimli Toplam:</span><span className="font-semibold">{formatCurrency(discountedSubTotal, sym)}</span></div>}
                <div className="flex justify-between"><span className="text-gray-600">KDV (%20):</span><span>{formatCurrency(kdvTotal, sym)}</span></div>
                <div className="flex justify-between text-lg font-extrabold border-t-2 border-gray-800 pt-2 mt-2"><span>GENEL TOPLAM:</span><span>{formatCurrency(finalTotal, sym)}</span></div>
                <div className="text-right text-xs text-gray-500 italic">{numberToText(finalTotal, currency)}</div>
              </div>
            </div>
          )}

          {/* Terms + Footer */}
          <div className="grid grid-cols-2 gap-6 text-[10px] text-gray-500 border-t pt-4 mt-6">
            <div>
              <h4 className="font-bold text-gray-900 uppercase mb-1 text-xs">Şartlar ve Koşullar</h4>
              <div className="whitespace-pre-wrap leading-relaxed">{conditions}</div>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900 text-sm">{brand.fullName}</p>
              <p className="text-[10px]">{brand.slogan}</p>
              {preparedBy && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-[10px] text-gray-400 uppercase">Teklifi Hazırlayan</p>
                  <p className="text-xs font-bold text-gray-800">{preparedBy}</p>
                </div>
              )}
              <div className="mt-2 flex justify-end"><img src={brand.qrUrl} alt="QR" className="w-12 h-12" crossOrigin="anonymous" /></div>
            </div>
          </div>

          {/* Brand Logos */}
          {brand.brandLogos.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex flex-wrap gap-4 items-center justify-center opacity-70">
                {brand.brandLogos.map((logo, i) => (
                  <img key={i} src={logo} className="h-7 w-auto object-contain" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Edit Mode
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yeni Teklif Oluştur</h1>
          <p className="text-sm text-gray-500 mt-1">{brand.fullName} • {proposalNo}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsPrintMode(true)} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-900"><Eye className="w-4 h-4" /> Önizle</button>
          <button onClick={handleSave} disabled={!isFormValid} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${isFormValid ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}><Save className="w-4 h-4" /> Kaydet</button>
        </div>
      </div>

      {/* Customer & Project Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Müşteri & Proje Bilgileri</h3>
          <button onClick={() => setShowCustomerPicker(!showCustomerPicker)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 flex items-center gap-1">
            <Users className="w-3 h-3" /> Kayıtlı Müşteri Seç
          </button>
        </div>

        {showCustomerPicker && brandCustomers.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 max-h-40 overflow-y-auto">
            {brandCustomers.map((c) => (
              <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-100 text-sm transition">
                <span className="font-semibold">{c.name}</span>
                {c.phone && <span className="text-gray-500 ml-2">{c.phone}</span>}
                {c.city && <span className="text-gray-500 ml-2">• {c.city}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Teklifi Hazırlayan — Zorunlu Alan */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" /> Teklifi Hazırlayan *
          </label>
          <div className="relative">
            <input
              type="text"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              className={`w-full md:w-80 p-2 border rounded-lg text-sm font-semibold ${!preparedBy.trim() ? 'border-red-400 bg-red-50' : 'border-green-400 bg-green-50'}`}
              placeholder="Adınızı yazın (zorunlu)"
            />
            {!preparedBy.trim() && (
              <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                <AlertCircle className="w-3 h-3" /> Bu alan zorunludur — doldurmadan Kaydet ve PDF oluşturulamaz
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Proje Adı</label>
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="Proje Adı" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Müşteri Adı</label>
            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="Firma / Kişi" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Telefon</label>
            <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="Telefon" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Şehir</label>
            <input type="text" value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="Şehir" />
          </div>
        </div>
      </div>

      {/* Settings Row + Exchange Rates */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500">Para Birimi:</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="p-1.5 border border-gray-300 rounded-lg text-sm">
            <option value="TRY">TL (₺)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={isCompactMode} onChange={(e) => setIsCompactMode(e.target.checked)} className="accent-blue-600" />
          <label className="text-xs font-bold text-gray-500">Kompakt Görünüm</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={globalHidePrices} onChange={(e) => setGlobalHidePrices(e.target.checked)} className="accent-orange-600" />
          <label className="text-xs font-bold text-orange-600">Fiyatları Gizle</label>
        </div>

        <div className="ml-auto flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-blue-600 uppercase">TCMB Kur</span>
            <RefreshCw className="w-3 h-3 text-blue-400 cursor-pointer hover:text-blue-600" onClick={async () => {
              try {
                const res = await fetch('/api/tcmb-kur');
                const data = await res.json();
                if (data.eur) setEurRate(data.eur);
                if (data.usd) setUsdRate(data.usd);
                if (data.gbp) setGbpRate(data.gbp);
              } catch {}
            }} />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">€1=</span>
            <input type="number" step="0.01" value={eurRate} onChange={(e) => setEurRate(parseFloat(e.target.value) || 0)} className="w-16 text-xs font-bold text-center border border-blue-300 rounded px-1 py-0.5 bg-white" />
            <span className="text-[10px] text-gray-500">₺</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">$1=</span>
            <input type="number" step="0.01" value={usdRate} onChange={(e) => setUsdRate(parseFloat(e.target.value) || 0)} className="w-16 text-xs font-bold text-center border border-blue-300 rounded px-1 py-0.5 bg-white" />
            <span className="text-[10px] text-gray-500">₺</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">£1=</span>
            <input type="number" step="0.01" value={gbpRate} onChange={(e) => setGbpRate(parseFloat(e.target.value) || 0)} className="w-16 text-xs font-bold text-center border border-blue-300 rounded px-1 py-0.5 bg-white" />
            <span className="text-[10px] text-gray-500">₺</span>
          </div>
        </div>
      </div>

      {/* Add Item Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Ürün Ekle</h3>
          <span className="text-xs text-gray-400">Ürün adı yazarak kataloğdan arayın veya manuel ekleyin</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2 relative">
            <label className="block text-xs font-bold text-gray-500 mb-1">Ürün Adı *</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-gray-400 w-3.5 h-3.5" />
              <input
                ref={nameInputRef}
                type="text"
                value={newItem.name}
                onChange={(e) => handleNameInput(e.target.value)}
                onFocus={() => { if (newItem.name.length >= 2 && nameSuggestions.length > 0) setShowNameSuggestions(true); }}
                onBlur={() => { setTimeout(() => setShowNameSuggestions(false), 200); }}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Ürün adı veya marka yazın..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !showNameSuggestions) addItem();
                  if (e.key === 'Escape') setShowNameSuggestions(false);
                }}
              />
            </div>

            {/* Livesearch Dropdown */}
            {showNameSuggestions && nameSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto">
                <div className="px-3 py-1.5 bg-gray-50 border-b text-[10px] font-bold text-gray-400 uppercase sticky top-0">
                  {nameSuggestions.length} ürün bulundu — seçmek için tıklayın
                </div>
                {nameSuggestions.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(p)}
                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-50 transition flex items-center gap-3 group"
                  >
                    <div className="w-10 h-10 rounded border bg-gray-50 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {p.image ? (
                        <img src={p.image} alt="" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full bg-gray-100" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 line-clamp-1 group-hover:text-blue-700">{p.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(p as any).manufacturer && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{(p as any).manufacturer}</span>
                        )}
                        {p.category && (
                          <span className="text-[10px] text-gray-400 line-clamp-1">{p.category.split('>').pop()?.trim()}</span>
                        )}
                        {(p as any).sku && (
                          <span className="text-[10px] text-gray-400 font-mono">{(p as any).sku}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-gray-500">€{p.price.toLocaleString('tr-TR')}</div>
                      <div className="text-sm font-bold text-gray-900">₺{eurToTry(p.price).toLocaleString('tr-TR')}</div>
                      <div className="text-[10px] text-green-600 font-bold opacity-0 group-hover:opacity-100 transition">+ Ekle</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Fiyat (₺)</label>
            <input type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Maliyet (₺)</label>
            <input type="number" value={newItem.cost} onChange={(e) => setNewItem({ ...newItem, cost: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Adet</label>
            <input type="number" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="1" min="1" />
          </div>
          <div>
            <button onClick={() => addItem()} className={`w-full py-2 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 ${brand.id === 'mutpro' ? 'bg-[#040023]' : 'bg-red-600'} hover:opacity-90`}>
              <Plus className="w-4 h-4" /> Ekle
            </button>
          </div>
        </div>
      </div>

      {/* Yeni Ürün Oluştur ve Kaydet */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <button
          onClick={() => setShowNewProductForm(!showNewProductForm)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-green-600" />
            <span className="text-sm font-bold text-gray-700 uppercase">Yeni Ürün Oluştur ve Kaydet</span>
            <span className="text-xs text-gray-400">Katalogda olmayan ürünleri sisteme kaydedin</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showNewProductForm ? 'rotate-180' : ''}`} />
        </button>
        {showNewProductForm && (
          <div className="px-5 pb-5 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">Ürün Adı *</label>
                <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="Ürün adı" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Kategori</label>
                <input type="text" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="Ör: Fırınlar" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Fiyat (€ EUR)</label>
                <input type="number" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Maliyet (€ EUR)</label>
                <input type="number" value={newProduct.cost} onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Görsel URL</label>
                <input type="text" value={newProduct.image} onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="https://..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1">Ürün Linki</label>
                <input type="text" value={newProduct.product_link} onChange={(e) => setNewProduct({ ...newProduct, product_link: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="https://..." />
              </div>
              <div className="flex items-end">
                <button onClick={saveNewProduct} className="w-full py-2 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4" /> Kaydet ve Ekle
                </button>
              </div>
            </div>
            {newProduct.price && (
              <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                €{parseFloat(newProduct.price).toLocaleString('tr-TR')} × {eurRate} = <span className="font-bold text-gray-900">₺{eurToTry(parseFloat(newProduct.price) || 0).toLocaleString('tr-TR')}</span> (TL karşılığı)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Items Table */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase text-left">
                <th className="py-3 px-2 w-8"></th>
                <th className="py-3 px-2 w-10">#</th>
                {!isCompactMode && <th className="py-3 px-2 w-20">Görsel</th>}
                <th className="py-3 px-2">Ürün</th>
                <th className="py-3 px-2 text-center w-14">Adet</th>
                <th className="py-3 px-2 text-right w-32">Birim Fiyat</th>
                <th className="py-3 px-2 text-right w-28 bg-orange-50">Kâr</th>
                <th className="py-3 px-2 text-right w-28">Toplam</th>
                <th className="py-3 px-2 w-28 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const brutUnitPrice = item.price * (1 - item.item_discount / 100);
                const netUnitPrice = brutUnitPrice / (1 + KDV_RATE);
                const netLineTotal = item.total / (1 + KDV_RATE);
                const itemProfit = (netUnitPrice - item.cost) * item.quantity;
                const itemProfitPercent = item.cost > 0 ? ((netUnitPrice - item.cost) / item.cost) * 100 : 100;
                return (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 hover:bg-gray-50 align-top"
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnter={() => handleDragEnter(idx)}
                    onDragEnd={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <td className="py-3 px-2 cursor-grab text-gray-300 hover:text-gray-600"><GripVertical className="w-4 h-4" /></td>
                    <td className="py-3 px-2 text-center text-gray-400 font-medium">{idx + 1}</td>
                    {!isCompactMode && (
                      <td className="py-3 px-2">
                        <div className="w-16 h-16 border rounded bg-white overflow-hidden">
                          {item.image ? <img src={item.image} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=Yok'; }} /> : <div className="w-full h-full bg-gray-100" />}
                        </div>
                      </td>
                    )}
                    <td className="py-3 px-2 min-w-[180px]">
                      <textarea value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} className="w-full bg-transparent resize-none outline-none font-medium text-gray-900" rows={1} placeholder="Ürün adı" />
                      <textarea value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className="w-full bg-transparent resize-none outline-none text-xs text-gray-500 mt-0.5" rows={1} placeholder="Açıklama" />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="w-12 text-center bg-transparent font-semibold" min="1" />
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="text-base font-bold text-gray-900 text-right">{formatCurrency(netUnitPrice, sym)}</div>
                      <div className="text-[9px] text-gray-400 mt-0.5 text-right">KDV Dahil giriş:</div>
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-[10px] text-gray-400">₺</span>
                        <input type="number" value={item.price} onChange={(e) => updateItem(item.id, 'price', e.target.value)} className="w-24 text-right text-xs text-gray-500 bg-transparent border-b border-gray-200 hover:border-gray-400 focus:border-blue-500 outline-none transition" />
                      </div>
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <span className="text-[10px] text-red-400">İnd%:</span>
                        <input type="number" value={item.item_discount} onChange={(e) => updateItem(item.id, 'item_discount', e.target.value)} className="w-10 text-right text-xs border-b border-gray-200 outline-none text-red-500 font-bold" placeholder="0" />
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right bg-orange-50/50">
                      <div className={`text-xs font-bold ${itemProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(itemProfit, sym)}</div>
                      <div className={`text-[10px] px-1.5 py-0.5 rounded w-fit ml-auto mt-0.5 ${itemProfitPercent > 20 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>%{itemProfitPercent.toFixed(0)}</div>
                      <div className="mt-1">
                        <span className="text-[9px] text-gray-400">Maliyet:</span>
                        <input type="number" value={item.cost} onChange={(e) => updateItem(item.id, 'cost', e.target.value)} className="w-20 text-center text-xs bg-white border border-gray-200 rounded px-1 py-0.5 mt-0.5" placeholder="0" />
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-gray-800">{formatCurrency(netLineTotal, sym)}</td>
                    <td className="py-3 px-2">
                      <div className="grid grid-cols-2 gap-1 w-fit mx-auto">
                        <button onClick={() => updateItem(item.id, 'hide_price', !item.hide_price)} className={`p-1.5 rounded ${item.hide_price ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'} hover:bg-orange-200`} title="Fiyatı Gizle">
                          {item.hide_price ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => updateItem(item.id, 'shipped', !item.shipped)} className={`p-1.5 rounded ${item.shipped ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'} hover:bg-red-200`} title="Sevk Edildi">
                          <Truck className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => duplicateItem(idx)} className="p-1.5 rounded bg-blue-50 text-blue-500 hover:bg-blue-200" title="Kopyala"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeItem(item.id)} className="p-1.5 rounded bg-rose-50 text-rose-500 hover:bg-rose-200" title="Sil"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals + Profit */}
      {items.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6 justify-end">
          {/* Profit Box */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 min-w-[320px] shadow-sm">
            <h4 className="text-sm font-bold text-orange-800 mb-3 border-b border-orange-200 pb-2">📊 Kâr Analizi</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Satış Toplamı:</span><span className="font-semibold">{formatCurrency(discountedSubTotal, sym)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Maliyet:</span><span className="font-semibold">{formatCurrency(totalCost, sym)}</span></div>
              <div className="border-t border-orange-200 pt-2 flex justify-between bg-orange-100 p-2 rounded">
                <span className="font-bold text-orange-900">Net Kâr:</span>
                <span className={`font-bold text-lg ${netProfit > 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(netProfit, sym)}</span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500 text-xs">Marj:</span><span className={`font-bold text-sm ${profitMargin > 20 ? 'text-green-600' : 'text-orange-600'}`}>%{profitMargin.toFixed(1)}</span></div>
            </div>
          </div>

          {/* Totals Box */}
          <div className="w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm text-gray-600"><span>Ara Toplam (KDV Hariç):</span><span className="font-semibold">{formatCurrency(subTotal, sym)}</span></div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-600">Genel İndirim:</span>
              <div className="flex items-center gap-2">
                <input type="number" min="0" value={discountValue} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)} className="w-20 text-right border-b border-gray-300 outline-none bg-transparent text-sm font-semibold" />
                <span className="text-red-500 font-semibold text-sm">-{formatCurrency(discountValue, sym)}</span>
              </div>
            </div>
            {discountValue > 0 && <div className="flex justify-between text-sm border-t border-dashed pt-2"><span className="text-gray-600">İndirimli Ara Toplam:</span><span className="font-semibold">{formatCurrency(discountedSubTotal, sym)}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-gray-600">KDV (%20):</span><span>{formatCurrency(kdvTotal, sym)}</span></div>
            <div className="flex justify-between text-xl font-extrabold text-gray-900 border-t-2 border-gray-800 pt-3 mt-2"><span>GENEL TOPLAM:</span><span>{formatCurrency(finalTotal, sym)}</span></div>
            <div className="text-right text-xs text-gray-500 italic">{numberToText(finalTotal, currency)}</div>
          </div>
        </div>
      )}

      {/* Conditions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Şartlar ve Koşullar</h3>
        <textarea value={conditions} onChange={(e) => setConditions(e.target.value)} className="w-full h-28 border border-gray-300 rounded-lg p-3 text-sm outline-none resize-none focus:border-blue-500" />
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">{items.length} kalem ürün</div>
        <div className="flex gap-2">
          <button onClick={() => setIsPrintMode(true)} className="bg-gray-800 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-900"><Eye className="w-5 h-5" /> Önizle ve Yazdır</button>
        </div>
      </div>
    </div>
  );
}
