'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { getBrand } from '@/lib/brands';
import { formatCurrency, getCurrencySymbol, numberToText, generateProposalNo, getTodayDate, getValidityDate, getValidityText } from '@/lib/helpers';
import type { ProposalItem, Proposal, PackageTemplate, PackageItem } from '@/lib/types';
import {
  Plus, Trash2, Copy, GripVertical, Eye, EyeOff, Truck, Save, FileDown,
  Printer, ArrowLeft, Search, Users, ChevronDown, RefreshCw, Package, UserCheck, AlertCircle, Boxes, X, Edit2,
  List, LayoutGrid
} from 'lucide-react';

export default function YeniTeklifPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brand as string;
  const brand = getBrand(brandId);
  const { products, customers, proposals, addProposal, updateProposal, addProduct, removeProduct, setProducts, rates, packages, addPackage, removePackage, setPackages } = useAppStore();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const editingProposal = editId ? proposals.find(p => p.id === editId) : null;
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

  const [proposalNo, setProposalNo] = useState(generateProposalNo(brandId));
  const [proposalDate, setProposalDate] = useState(getTodayDate());
  const [projectName, setProjectName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [currency, setCurrency] = useState('TRY');
  const [inputCurrency] = useState('EUR'); // Ürünler EUR bazlı gelir
  const [discountValue, setDiscountValue] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [includeVAT] = useState(true); // KDV her zaman dahil mantığı
  const [globalHidePrices, setGlobalHidePrices] = useState(false);
  const [preparedBy, setPreparedBy] = useState('');
  const [showIban, setShowIban] = useState(false);
  const [selectedIban, setSelectedIban] = useState<number>(0); // 0=hepsi, 1=kurumsal, 2=bireysel
  const [conditions, setConditions] = useState(
    `- Bu teklif 3 gün süreyle geçerlidir.\n- Stok durumuna göre tarafınıza bilgilendirilmektedir.\n- Fiyatlarımıza KDV hariçtir (Listede hariç gösterilir, toplamda eklenir).`
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [viewMode, setViewMode] = useState<'liste' | 'katalog'>('liste');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  // New item form
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', cost: '', quantity: '1', image: '', product_link: '' });

  // New product form (kataloga kaydetme)
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', category: '', price: '', cost: '', image: '', product_link: '' });
  const [newProductCurrency, setNewProductCurrency] = useState<'EUR' | 'TRY' | 'USD' | 'GBP'>('EUR');

  // Livesearch state for product name input
  const [nameSuggestions, setNameSuggestions] = useState<typeof brandProducts>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Package management
  const [showPackageManager, setShowPackageManager] = useState(false);
  const [showPackageDropdown, setShowPackageDropdown] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageTemplate | null>(null);
  const [newPackageName, setNewPackageName] = useState('');
  const [newPkgItem, setNewPkgItem] = useState({ name: '', description: '', price: '', cost: '', quantity: '1', image: '', product_link: '' });
  const brandPackages = packages.filter(p => p.brand_id === brandId);

  // Load existing proposal for editing
  useEffect(() => {
    if (editingProposal && !isLoaded) {
      setProposalNo(editingProposal.proposal_no);
      setProposalDate(editingProposal.proposal_date);
      setProjectName(editingProposal.project_name);
      setCustomerName(editingProposal.customer_name);
      setCustomerPhone(editingProposal.customer_phone);
      setCustomerCity(editingProposal.customer_city);
      setCustomerAddress(editingProposal.customer_address);
      setPreparedBy(editingProposal.prepared_by);
      setItems(editingProposal.items || []);
      setCurrency(editingProposal.currency);
      setDiscountValue(editingProposal.discount_value);
      setGlobalHidePrices(editingProposal.global_hide_prices);
      setConditions(editingProposal.conditions);
      setIsLoaded(true);
    }
  }, [editingProposal, isLoaded]);

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const addItem = useCallback((item?: Partial<ProposalItem>, skipCatalog?: boolean) => {
    const newEntry: ProposalItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: item?.name || newItem.name || '',
      description: item?.description || newItem.description || '',
      sku: item?.sku || '',
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

    // Otomatik ürün kataloğuna kaydet (aynı isim yoksa) — paket yüklemelerinde atla
    if (!skipCatalog) {
      const exists = products.some(p => p.brand_id === brandId && p.name.toLowerCase() === newEntry.name.toLowerCase());
      if (!exists && newEntry.name.trim()) {
        addProduct({
          id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          brand_id: brandId,
          name: newEntry.name,
          description: newEntry.description || '',
          price: newEntry.price,
          cost: newEntry.cost,
          image: newEntry.image || '',
          product_link: newEntry.product_link || '',
          category: '',
          currency: 'TRY',
        });
      }
    }
  }, [newItem, currency, products, brandId, addProduct]);

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

  // Ürün fiyatını TRY'ye çevir (ürün currency'sine göre)
  const productPriceToTry = (amount: number, productCurrency?: string) => {
    const cur = (productCurrency || 'TRY').toUpperCase();
    if (cur === 'TRY') return amount;
    if (cur === 'EUR') return Math.round(amount * eurRate * 100) / 100;
    if (cur === 'USD') return Math.round(amount * usdRate * 100) / 100;
    if (cur === 'GBP') return Math.round(amount * gbpRate * 100) / 100;
    return amount;
  };

  const addFromProduct = (p: any) => {
    const priceInTry = productPriceToTry(p.price, p.currency);
    const costInTry = productPriceToTry(p.cost || 0, p.currency);
    addItem({ name: p.name, description: '', sku: p.sku || '', price: priceInTry, cost: costInTry, image: p.image, product_link: p.product_link, quantity: 1 });
    setShowProductSearch(false);
    setProductSearch('');
    setShowNameSuggestions(false);
    setNameSuggestions([]);
    setNewItem({ name: '', description: '', price: '', cost: '', quantity: '1', image: '', product_link: '' });
  };

  const handleNameInput = (value: string) => {
    setNewItem({ ...newItem, name: value });
    if (value.length >= 2 && brandProducts.length > 0) {
      const words = value.toLowerCase().split(/\s+/).filter(w => w.length > 0);
      const matches = brandProducts.filter((p) => {
        const text = [p.name, p.sku || '', p.category || '', p.manufacturer || ''].join(' ').toLowerCase();
        return words.every(w => text.includes(w));
      }).slice(0, 30);
      setNameSuggestions(matches);
      setShowNameSuggestions(matches.length > 0);
    } else {
      setNameSuggestions([]);
      setShowNameSuggestions(false);
    }
  };

  const selectSuggestion = (p: any) => {
    const priceInTry = productPriceToTry(p.price, p.currency);
    const costInTry = productPriceToTry(p.cost || 0, p.currency);
    addItem({ name: p.name, description: '', sku: p.sku || '', price: priceInTry, cost: costInTry, image: p.image, product_link: p.product_link, quantity: 1 });
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

  const convertToTry = (amount: number, fromCurrency: string) => {
    if (fromCurrency === 'TRY') return amount;
    if (fromCurrency === 'EUR') return Math.round(amount * eurRate * 100) / 100;
    if (fromCurrency === 'USD') return Math.round(amount * usdRate * 100) / 100;
    if (fromCurrency === 'GBP') return Math.round(amount * gbpRate * 100) / 100;
    return amount;
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
      currency: newProductCurrency,
    };
    addProduct(product);
    // Teklife eklerken TRY'ye dönüştür
    const priceInTry = convertToTry(price, newProductCurrency);
    const costInTry = convertToTry(cost, newProductCurrency);
    addItem({ name: product.name, description: '', price: priceInTry, cost: costInTry, image: product.image, product_link: product.product_link, quantity: 1 });
    setNewProduct({ name: '', category: '', price: '', cost: '', image: '', product_link: '' });
    setShowNewProductForm(false);
  };

  // Sadece kataloga kaydet (teklife ekleme)
  const saveNewProductOnly = () => {
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
      currency: newProductCurrency,
    };
    addProduct(product);
    setNewProduct({ name: '', category: '', price: '', cost: '', image: '', product_link: '' });
    alert('Ürün kataloga kaydedildi!');
  };

  // Hazır paketi teklife yükle (kataloga eklemez)
  const loadPackageToProposal = (pkg: PackageTemplate) => {
    for (const item of pkg.items) {
      addItem({
        name: item.name,
        description: item.description || '',
        price: item.price,
        cost: item.cost,
        image: item.image,
        product_link: item.product_link,
        quantity: item.quantity || 1,
      }, true);
    }
    setShowPackageDropdown(false);
  };

  // Paket yönetimi: yeni paket oluştur
  const createNewPackage = () => {
    if (!newPackageName.trim()) return;
    const pkg: PackageTemplate = {
      id: `pkg-${Date.now()}`,
      brand_id: brandId,
      name: newPackageName.trim(),
      items: [],
    };
    addPackage(pkg);
    setEditingPackage(pkg);
    setNewPackageName('');
  };

  // Paket yönetimi: pakete ürün ekle
  const addItemToPackage = () => {
    if (!editingPackage || !newPkgItem.name.trim()) return;
    const item: PackageItem = {
      name: newPkgItem.name.trim(),
      description: newPkgItem.description,
      price: parseFloat(newPkgItem.price) || 0,
      cost: parseFloat(newPkgItem.cost) || 0,
      quantity: parseInt(newPkgItem.quantity) || 1,
      image: newPkgItem.image,
      product_link: newPkgItem.product_link,
    };
    const updated = { ...editingPackage, items: [...editingPackage.items, item] };
    setPackages(packages.map(p => p.id === updated.id ? updated : p));
    setEditingPackage(updated);
    setNewPkgItem({ name: '', description: '', price: '', cost: '', quantity: '1', image: '', product_link: '' });
  };

  // Paket yönetimi: paketten ürün sil
  const removeItemFromPackage = (idx: number) => {
    if (!editingPackage) return;
    const updated = { ...editingPackage, items: editingPackage.items.filter((_, i) => i !== idx) };
    setPackages(packages.map(p => p.id === updated.id ? updated : p));
    setEditingPackage(updated);
  };

  // Paket yönetimi: paketi teklife yükle
  const loadEditingPackageToProposal = () => {
    if (!editingPackage) return;
    loadPackageToProposal(editingPackage);
    setShowPackageManager(false);
  };

  // Calculations — Girilen fiyatlar KDV hariç (net)
  const KDV_RATE = 0.20;
  const subTotal = items.reduce((sum, i) => sum + i.total, 0); // KDV hariç ara toplam
  const discountedSubTotal = subTotal - discountValue;
  const kdvTotal = discountedSubTotal * KDV_RATE;
  const finalTotal = discountedSubTotal + kdvTotal + shippingCost; // Genel Toplam (KDV dahil + kargo)
  const totalCost = items.reduce((sum, i) => sum + i.cost * i.quantity, 0);
  const netProfit = discountedSubTotal - totalCost;
  const profitMargin = discountedSubTotal > 0 ? (netProfit / discountedSubTotal) * 100 : 0;
  const sym = getCurrencySymbol(currency);

  const convertCurrency = (amount: number) => {
    if (currency === 'TRY') return amount;
    if (currency === 'USD') return amount / usdRate;
    if (currency === 'EUR') return amount / eurRate;
    if (currency === 'GBP') return amount / gbpRate;
    return amount;
  };

  const isFormValid = preparedBy.trim().length > 0;

  const handleSave = () => {
    if (!isFormValid) return alert('Teklifi Hazırlayan alanı zorunludur!');
    if (editId) {
      // Update existing proposal
      updateProposal(editId, {
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
        total: finalTotal,
      });
      alert('Teklif başarıyla güncellendi!');
    } else {
      // Create new proposal
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
    }
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
        pagebreak: { mode: ['css'] },
      };
      await html2pdf().set(opt).from(printRef.current).save();

      // PDF indirildiğinde otomatik olarak geçmişe kaydet veya güncelle
      if (editId) {
        updateProposal(editId, {
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
        });
      } else {
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
      }
    } catch {
      alert('PDF oluşturulurken hata oluştu.');
    }
  };

  const filteredProducts = brandProducts.filter((p) => {
    if (!productSearch) return true;
    const words = productSearch.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const text = [p.name, p.sku || '', p.category || '', p.manufacturer || ''].join(' ').toLowerCase();
    return words.every(w => text.includes(w));
  });

  if (isPrintMode) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="no-print flex items-center gap-3 mb-4 p-3 bg-white rounded-xl border shadow-sm">
          <button onClick={() => setIsPrintMode(false)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"><ArrowLeft className="w-4 h-4" /> Düzenlemeye Dön</button>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Önizleme Modu</span>
          <button
            onClick={() => setViewMode(viewMode === 'liste' ? 'katalog' : 'liste')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'katalog' ? 'bg-green-600 text-white' : 'bg-gray-700 text-white'}`}
          >
            {viewMode === 'liste' ? <><List className="w-3.5 h-3.5" /> Görünüm: Liste</> : <><LayoutGrid className="w-3.5 h-3.5" /> Görünüm: Katalog</>}
          </button>
          <div className="flex-1" />
          <button onClick={handlePrint} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Printer className="w-4 h-4" /> Yazdır</button>
          <button onClick={handleDownloadPDF} disabled={!isFormValid} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${isFormValid ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}><FileDown className="w-4 h-4" /> PDF İndir</button>
          <button onClick={handleSave} disabled={!isFormValid} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${isFormValid ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}><Save className="w-4 h-4" /> Kaydet</button>
          {!isFormValid && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Hazırlayan alanını doldurun</span>}
        </div>

        <div ref={printRef} className="bg-white p-6 rounded-xl shadow-lg page-container">
          {/* Header */}
          <div className="mb-6 pb-4 border-b-2" style={{ borderColor: brand.accentColor }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ maxWidth: '55%' }}>
                <img src={brand.logo} alt={brand.name} style={{ maxHeight: '88px', maxWidth: '340px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }} crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div style={{ textAlign: 'right', paddingTop: 0, marginTop: 0 }}>
                <h1 className={`text-lg font-extrabold ${brand.textColor}`} style={{ margin: 0, padding: 0, lineHeight: 1 }}>FİYAT TEKLİFİ</h1>
                <div className="text-xs text-gray-600" style={{ marginTop: '6px' }}>
                  <div><span className="font-bold">Teklif No:</span> {proposalNo}</div>
                  <div><span className="font-bold">Tarih:</span> {proposalDate}</div>
                  <div><span className="font-bold">Geçerlilik:</span> {getValidityDate()}</div>
                  {preparedBy && <div><span className="font-bold">Hazırlayan:</span> {preparedBy}</div>}
                </div>
              </div>
            </div>
            <div className="text-[10px] text-gray-500 leading-tight" style={{ marginTop: '6px' }}>
              {brand.address.map((line, i) => <div key={i}>{line}</div>)}
              <div>{brand.phone} • {brand.email}</div>
              <div className="font-semibold">{brand.website}</div>
            </div>
          </div>

          {/* Customer + Project */}
          <div className="grid grid-cols-2 gap-6 mb-8" style={{ pageBreakAfter: 'avoid' }}>
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

          {/* Items — Liste veya Katalog Görünüm */}
          {items.length > 0 && viewMode === 'liste' && (
            <table className="w-full text-sm mb-8" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ backgroundColor: brand.tableHeaderBgHex, color: brand.tableHeaderTextHex, verticalAlign: 'middle', borderBottom: `2px solid ${brand.tableBorderHex}` }} className="py-4 px-3 text-center w-10 text-[11px] font-bold tracking-wide uppercase">#</th>
                  {!isCompactMode && <th style={{ backgroundColor: brand.tableHeaderBgHex, color: brand.tableHeaderTextHex, verticalAlign: 'middle', borderBottom: `2px solid ${brand.tableBorderHex}` }} className="py-4 px-3 text-center w-24 text-[11px] font-bold tracking-wide uppercase">Görsel</th>}
                  <th style={{ backgroundColor: brand.tableHeaderBgHex, color: brand.tableHeaderTextHex, verticalAlign: 'middle', borderBottom: `2px solid ${brand.tableBorderHex}` }} className="py-4 px-3 text-center text-[11px] font-bold tracking-wide uppercase">Ürün Adı / Açıklama (Opsiyonel)</th>
                  <th style={{ backgroundColor: brand.tableHeaderBgHex, color: brand.tableHeaderTextHex, verticalAlign: 'middle', borderBottom: `2px solid ${brand.tableBorderHex}` }} className="py-4 px-3 text-center w-14 text-[11px] font-bold tracking-wide uppercase">Adet</th>
                  {!globalHidePrices && <th style={{ backgroundColor: brand.tableHeaderBgHex, color: brand.tableHeaderTextHex, verticalAlign: 'middle', borderBottom: `2px solid ${brand.tableBorderHex}` }} className="py-4 px-3 text-center w-32 text-[11px] font-bold tracking-wide uppercase">Birim Fiyat</th>}
                  {!globalHidePrices && <th style={{ backgroundColor: brand.tableHeaderBgHex, color: brand.tableHeaderTextHex, verticalAlign: 'middle', borderBottom: `2px solid ${brand.tableBorderHex}` }} className="py-4 px-3 text-center w-32 text-[11px] font-bold tracking-wide uppercase">Toplam Fiyat</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const netUnitPrice = item.price * (1 - item.item_discount / 100);
                  const netLineTotal = item.total;
                  const isHidden = globalHidePrices || item.hide_price;
                  return (
                    <tr key={item.id} className={item.shipped ? 'line-through opacity-50' : ''} style={{ borderBottom: `1px solid ${brand.tableBorderHex}`, backgroundColor: idx % 2 === 1 ? brand.tableStripeBgHex : '#ffffff', pageBreakInside: 'avoid' }}>
                      <td className="py-5 px-3 text-center text-gray-500 font-medium text-sm">{idx + 1}</td>
                      {!isCompactMode && (
                        <td className="py-4 px-3">
                          <div className="w-20 h-20 border rounded bg-white overflow-hidden">
                            {item.image ? <img src={item.image} className="w-full h-full object-contain" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <div className="w-full h-full bg-gray-100" />}
                          </div>
                        </td>
                      )}
                      <td className="py-5 px-3">
                        <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                        {item.sku && <div className="text-[10px] text-gray-400 mt-0.5">Ürün Kodu: {item.sku}</div>}
                        {item.description && <div className="text-xs text-gray-500 italic mt-0.5">{item.description}</div>}
                      </td>
                      <td className="py-5 px-3 text-center font-semibold text-sm">{item.quantity}</td>
                      {!isHidden && <td className="py-5 px-3 text-right font-bold text-sm">{formatCurrency(convertCurrency(netUnitPrice), sym)}</td>}
                      {!isHidden && <td className="py-5 px-3 text-right font-bold text-sm">{formatCurrency(convertCurrency(netLineTotal), sym)}</td>}
                      {isHidden && !globalHidePrices && <td className="py-3 px-2 text-center text-gray-400">-</td>}
                      {isHidden && !globalHidePrices && <td className="py-3 px-2 text-center text-gray-400">-</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Katalog Görünüm */}
          {items.length > 0 && viewMode === 'katalog' && (
            <div className="space-y-4 mb-8">
              {items.map((item, idx) => {
                const netUnitPrice = item.price * (1 - item.item_discount / 100);
                const netLineTotal = item.total;
                const isHidden = globalHidePrices || item.hide_price;
                return (
                  <div key={item.id} className={`flex gap-5 p-4 rounded-xl border ${item.shipped ? 'opacity-50 line-through' : ''}`} style={{ borderColor: brand.tableBorderHex, pageBreakInside: 'avoid' }}>
                    <div className="w-36 h-36 flex-shrink-0 border rounded-lg bg-white overflow-hidden">
                      {item.image ? <img src={item.image} className="w-full h-full object-contain" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <div className="w-full h-full bg-gray-100" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-base">{item.name}</div>
                      {item.sku && <div className="text-xs text-gray-400 mt-0.5">Ürün Kodu: {item.sku}</div>}
                      {item.description && <div className="text-sm text-gray-500 italic mt-1">{item.description}</div>}
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-sm text-gray-500">{item.quantity} Adet x {!isHidden ? formatCurrency(convertCurrency(netUnitPrice), sym) : '-'}</span>
                        {!isHidden && <span className="text-lg font-extrabold text-gray-900 ml-auto">{formatCurrency(convertCurrency(netLineTotal), sym)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Totals — KDV hariç ara toplam + KDV satırı + Kargo + Genel Toplam */}
          {!globalHidePrices && (
            <div className="flex justify-end mb-8" style={{ pageBreakInside: 'avoid' }}>
              <div className="w-80 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Ara Toplam (KDV Hariç):</span><span className="font-semibold">{formatCurrency(convertCurrency(subTotal), sym)}</span></div>
                {discountValue > 0 && <div className="flex justify-between text-red-600"><span>İndirim:</span><span>-{formatCurrency(convertCurrency(discountValue), sym)}</span></div>}
                {discountValue > 0 && <div className="flex justify-between border-t pt-1"><span className="text-gray-600">İndirimli Toplam:</span><span className="font-semibold">{formatCurrency(convertCurrency(discountedSubTotal), sym)}</span></div>}
                <div className="flex justify-between"><span className="text-gray-600">KDV (%20):</span><span>{formatCurrency(convertCurrency(kdvTotal), sym)}</span></div>
                {shippingCost > 0 && <div className="flex justify-between"><span className="text-gray-600">Kargo / Taşıma Bedeli:</span><span>{formatCurrency(convertCurrency(shippingCost), sym)}</span></div>}
                <div className="flex justify-between text-lg font-extrabold border-t-2 border-gray-800 pt-2 mt-2"><span>GENEL TOPLAM:</span><span>{formatCurrency(convertCurrency(finalTotal), sym)}</span></div>
                <div className="text-right text-xs text-gray-500 italic">{numberToText(convertCurrency(finalTotal), currency)}</div>
              </div>
            </div>
          )}

          {/* IBAN / Ödeme Bilgileri */}
          {showIban && (
            <div className="mb-6 border border-gray-200 rounded-lg p-4" style={{ pageBreakInside: 'avoid' }}>
              <h4 className="font-bold text-gray-900 uppercase mb-3 text-xs">Ödeme Bilgileri</h4>
              <div className="space-y-3 text-xs">
                {(selectedIban === 0 || selectedIban === 1) && (
                  <div className="border-l-4 border-blue-500 pl-3">
                    <p className="font-bold text-gray-800">GÜÇLÜ REKLAM METAL ENDÜSTRİYEL TİCARET LİMİTED ŞİRKETİ</p>
                    <p className="font-mono text-gray-600 mt-0.5">TR43 0006 7010 0000 0011 6944 20</p>
                    <p className="text-gray-500">Yapı Kredi Bankası</p>
                  </div>
                )}
                {(selectedIban === 0 || selectedIban === 2) && (
                  <div className="border-l-4 border-green-500 pl-3">
                    <p className="font-bold text-gray-800">Buse Turancı</p>
                    <p className="font-mono text-gray-600 mt-0.5">TR37 0006 7010 0000 0021 0036 18</p>
                    <p className="text-gray-500">Yapı Kredi Bankası</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Terms + Footer */}
          <div className="grid grid-cols-2 gap-6 text-[10px] text-gray-500 border-t pt-4 mt-6" style={{ pageBreakInside: 'avoid' }}>
            <div>
              <h4 className="font-bold text-gray-900 uppercase mb-1 text-xs">Şartlar ve Koşullar</h4>
              <div className="whitespace-pre-wrap leading-relaxed">{conditions}</div>
            </div>
            <div className="text-right">
              {preparedBy && (
                <div className="mb-3 pb-2 border-b border-gray-200">
                  <p className="text-[10px] text-gray-400 uppercase">Teklifi Hazırlayan</p>
                  <p className="text-xs font-bold text-gray-800">{preparedBy}</p>
                </div>
              )}
              <p className="font-bold text-gray-900 text-sm">{brand.fullName}</p>
              <p className="text-[10px]">{brand.slogan}</p>
              <div className="mt-2 flex justify-end"><img src={brand.qrUrl} alt="QR" className="w-12 h-12" crossOrigin="anonymous" /></div>
            </div>
          </div>

          {/* Brand Logos */}
          {brand.brandLogos.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200" style={{ pageBreakInside: 'avoid' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px 16px', alignItems: 'center', justifyItems: 'center' }}>
                {brand.brandLogos.map((logo, i) => (
                  <img key={i} src={logo} style={{ height: '32px', width: 'auto', objectFit: 'contain', opacity: 0.7 }} alt="" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Ürün Ekle</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPackageManager(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition">
              <Boxes className="w-3.5 h-3.5" /> Paketleri Yönet
            </button>
            <div className="relative">
              <button onClick={() => setShowPackageDropdown(!showPackageDropdown)} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-300 rounded-lg text-xs font-bold text-yellow-700 hover:bg-yellow-100 transition">
                <Package className="w-3.5 h-3.5" /> Hazır Paket Yükle
              </button>
              {showPackageDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[240px]">
                  {brandPackages.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-gray-400">Henüz paket yok</div>
                  ) : (
                    brandPackages.map(pkg => (
                      <button key={pkg.id} onClick={() => loadPackageToProposal(pkg)} className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 transition">
                        <div className="font-semibold text-sm text-gray-900">{pkg.name}</div>
                        <div className="text-[10px] text-gray-400">{pkg.items.length} Ürün</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
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
                        {p.manufacturer && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{p.manufacturer}</span>
                        )}
                        {p.category && (
                          <span className="text-[10px] text-gray-400 line-clamp-1">{p.category.split('>').pop()?.trim()}</span>
                        )}
                        {p.sku && (
                          <span className="text-[10px] text-gray-400 font-mono">{p.sku}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-gray-900">₺{productPriceToTry(p.price, p.currency).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                      {p.currency && p.currency !== 'TRY' && (
                        <div className="text-[10px] text-gray-400">{p.currency} {p.price.toLocaleString('tr-TR')}</div>
                      )}
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
            <button onClick={() => addItem()} className={`w-full py-2 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 ${brand.buttonColor} hover:opacity-90`}>
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
                <label className="block text-xs font-bold text-gray-500 mb-1">Para Birimi</label>
                <select value={newProductCurrency} onChange={(e) => setNewProductCurrency(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold">
                  <option value="TRY">₺ TRY</option>
                  <option value="EUR">€ EUR</option>
                  <option value="USD">$ USD</option>
                  <option value="GBP">£ GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Fiyat ({getCurrencySymbol(newProductCurrency)} {newProductCurrency})</label>
                <input type="number" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Maliyet ({getCurrencySymbol(newProductCurrency)} {newProductCurrency})</label>
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
              <div className="flex items-end gap-2">
                <button onClick={saveNewProductOnly} className="flex-1 py-2 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700">
                  <Save className="w-4 h-4" /> Kaydet
                </button>
                <button onClick={saveNewProduct} className="flex-1 py-2 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4" /> Ekle
                </button>
              </div>
            </div>
            {newProduct.price && newProductCurrency !== 'TRY' && (
              <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                {getCurrencySymbol(newProductCurrency)}{parseFloat(newProduct.price).toLocaleString('tr-TR')} × {newProductCurrency === 'EUR' ? eurRate : newProductCurrency === 'USD' ? usdRate : gbpRate} = <span className="font-bold text-gray-900">₺{convertToTry(parseFloat(newProduct.price) || 0, newProductCurrency).toLocaleString('tr-TR')}</span> (TL karşılığı)
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
                const netUnitPrice = item.price * (1 - item.item_discount / 100);
                const netLineTotal = item.total;
                const displayUnitPrice = convertCurrency(netUnitPrice);
                const displayLineTotal = convertCurrency(netLineTotal);
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
                      {item.sku && <div className="text-[10px] text-gray-400">Kod: {item.sku}</div>}
                      <textarea value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className="w-full bg-transparent resize-none outline-none text-xs text-gray-500 mt-0.5" rows={1} placeholder="Açıklama" />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="w-12 text-center bg-transparent font-semibold" min="1" />
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs text-gray-400">{sym}</span>
                        <input
                          type="number"
                          value={Math.round(displayUnitPrice * 100) / 100}
                          onChange={(e) => {
                            const displayVal = parseFloat(e.target.value) || 0;
                            // Dövizden TL'ye çevir → dahili fiyatı TL olarak kaydet
                            const tryVal = currency === 'TRY' ? displayVal
                              : currency === 'EUR' ? displayVal * eurRate
                              : currency === 'USD' ? displayVal * usdRate
                              : currency === 'GBP' ? displayVal * gbpRate
                              : displayVal;
                            updateItem(item.id, 'price', tryVal.toFixed(2));
                          }}
                          className="w-28 text-right text-base font-bold text-gray-800 bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 outline-none transition"
                        />
                      </div>
                      <div className="text-[9px] text-gray-400 mt-0.5 text-right">KDV Dahil: {formatCurrency(displayUnitPrice * (1 + KDV_RATE), sym)}</div>
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <span className="text-[10px] text-red-400">İnd%:</span>
                        <input type="number" value={item.item_discount} onChange={(e) => updateItem(item.id, 'item_discount', e.target.value)} className="w-10 text-right text-xs border-b border-gray-200 outline-none text-red-500 font-bold" placeholder="0" />
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right bg-orange-50/50">
                      <div className={`text-xs font-bold ${itemProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(convertCurrency(itemProfit), sym)}</div>
                      <div className={`text-[10px] px-1.5 py-0.5 rounded w-fit ml-auto mt-0.5 ${itemProfitPercent > 20 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>%{itemProfitPercent.toFixed(0)}</div>
                      <div className="mt-1">
                        <span className="text-[9px] text-gray-400">Maliyet:</span>
                        <input type="number" value={Math.round(convertCurrency(item.cost) * 100) / 100} onChange={(e) => {
                          const displayCost = parseFloat(e.target.value) || 0;
                          const tryCost = currency === 'TRY' ? displayCost
                            : currency === 'EUR' ? displayCost * eurRate
                            : currency === 'USD' ? displayCost * usdRate
                            : currency === 'GBP' ? displayCost * gbpRate
                            : displayCost;
                          updateItem(item.id, 'cost', tryCost.toFixed(2));
                        }} className="w-20 text-center text-xs bg-white border border-gray-200 rounded px-1 py-0.5 mt-0.5" placeholder="0" />
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-gray-800">{formatCurrency(displayLineTotal, sym)}</td>
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
              <div className="flex justify-between"><span className="text-gray-600">Satış Toplamı:</span><span className="font-semibold">{formatCurrency(convertCurrency(discountedSubTotal), sym)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Maliyet:</span><span className="font-semibold">{formatCurrency(convertCurrency(totalCost), sym)}</span></div>
              <div className="border-t border-orange-200 pt-2 flex justify-between bg-orange-100 p-2 rounded">
                <span className="font-bold text-orange-900">Net Kâr:</span>
                <span className={`font-bold text-lg ${netProfit > 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(convertCurrency(netProfit), sym)}</span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500 text-xs">Marj:</span><span className={`font-bold text-sm ${profitMargin > 20 ? 'text-green-600' : 'text-orange-600'}`}>%{profitMargin.toFixed(1)}</span></div>
            </div>
          </div>

          {/* Totals Box */}
          <div className="w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm text-gray-600"><span>Ara Toplam:</span><span className="font-semibold">{formatCurrency(convertCurrency(subTotal), sym)}</span></div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-600">Genel İskonto:</span>
              <div className="flex items-center gap-2">
                <input type="number" min="0" value={discountValue} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)} className="w-20 text-right border-b border-gray-300 outline-none bg-transparent text-sm font-semibold" />
                <span className="text-red-500 font-semibold text-sm">-{formatCurrency(convertCurrency(discountValue), sym)}</span>
              </div>
            </div>
            {discountValue > 0 && <div className="flex justify-between text-sm border-t border-dashed pt-2"><span className="text-gray-600">İndirimli Ara Toplam:</span><span className="font-semibold">{formatCurrency(convertCurrency(discountedSubTotal), sym)}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-gray-600">KDV (%20):</span><span>{formatCurrency(convertCurrency(kdvTotal), sym)}</span></div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-600">Kargo / Taşıma Bedeli:</span>
              <div className="flex items-center gap-1">
                <input type="number" min="0" value={shippingCost} onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)} className="w-20 text-right border-b border-gray-300 outline-none bg-transparent text-sm font-semibold" />
                <span className="text-sm">{formatCurrency(convertCurrency(shippingCost), sym)}</span>
              </div>
            </div>
            <div className="flex justify-between text-xl font-extrabold text-gray-900 border-t-2 border-gray-800 pt-3 mt-2"><span>GENEL TOPLAM:</span><span>{formatCurrency(convertCurrency(finalTotal), sym)}</span></div>
            <div className="text-right text-xs text-gray-500 italic">{numberToText(convertCurrency(finalTotal), currency)}</div>
          </div>
        </div>
      )}

      {/* IBAN / Ödeme Bilgileri Ayarı */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700 uppercase">Ödeme Bilgileri (IBAN)</h3>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={showIban} onChange={(e) => setShowIban(e.target.checked)} className="accent-blue-600" />
            <label className="text-xs font-bold text-gray-500">Teklifte Göster</label>
          </div>
        </div>
        {showIban && (
          <div className="flex gap-3">
            <button onClick={() => setSelectedIban(0)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedIban === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>Her İkisi</button>
            <button onClick={() => setSelectedIban(1)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedIban === 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>Kurumsal (Güçlü Reklam)</button>
            <button onClick={() => setSelectedIban(2)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${selectedIban === 2 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>Bireysel (Buse Turancı)</button>
          </div>
        )}
      </div>

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

      {/* Paketleri Yönet Modal */}
      {showPackageManager && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 mb-10">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2"><Boxes className="w-5 h-5" /> Paketleri Yönet</h2>
              <button onClick={() => { setShowPackageManager(false); setEditingPackage(null); }} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex min-h-[500px]">
              {/* Sol panel: Paket listesi */}
              <div className="w-72 border-r p-4 space-y-3 overflow-y-auto">
                <div className="flex gap-2">
                  <input type="text" value={newPackageName} onChange={(e) => setNewPackageName(e.target.value)} placeholder="Paket Adı" className="flex-1 p-2 border border-gray-300 rounded-lg text-sm" onKeyDown={(e) => e.key === 'Enter' && createNewPackage()} />
                </div>
                <button onClick={createNewPackage} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">Yeni Paket Oluştur</button>

                {brandPackages.map(pkg => (
                  <div key={pkg.id} className={`p-3 rounded-xl border cursor-pointer transition ${editingPackage?.id === pkg.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="font-bold text-sm text-gray-900" onClick={() => setEditingPackage(pkg)}>{pkg.name}</div>
                    <div className="text-[10px] text-gray-400">{pkg.items.length} Ürün</div>
                    <div className="flex items-center gap-1 mt-2">
                      <button onClick={() => loadPackageToProposal(pkg)} className="text-[10px] text-blue-600 font-bold hover:underline">Listeye Yükle</button>
                      <button onClick={() => setEditingPackage(pkg)} className="p-1 rounded hover:bg-gray-100"><Edit2 className="w-3 h-3 text-gray-400" /></button>
                      <button onClick={() => { if (confirm('Bu paketi silmek istediğinize emin misiniz?')) { removePackage(pkg.id); if (editingPackage?.id === pkg.id) setEditingPackage(null); } }} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-3 h-3 text-red-400" /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sağ panel: Paket düzenleme */}
              <div className="flex-1 p-5 overflow-y-auto">
                {editingPackage ? (
                  <>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">{editingPackage.name}</h3>

                    {/* Pakete Yeni Ürün Ekle */}
                    <div className="border border-dashed border-gray-300 rounded-xl p-4 mb-4">
                      <h4 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Pakete Yeni Ürün Ekle</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                        <input type="text" value={newPkgItem.product_link} onChange={(e) => setNewPkgItem({ ...newPkgItem, product_link: e.target.value })} placeholder="Link (Otomatik İsim)" className="p-2 border border-gray-200 rounded-lg text-sm" />
                        <input type="text" value={newPkgItem.name} onChange={(e) => setNewPkgItem({ ...newPkgItem, name: e.target.value })} placeholder="Ürün Adı" className="p-2 border border-gray-200 rounded-lg text-sm col-span-full" />
                        <input type="text" value={newPkgItem.image} onChange={(e) => setNewPkgItem({ ...newPkgItem, image: e.target.value })} placeholder="Görsel URL" className="p-2 border border-gray-200 rounded-lg text-sm" />
                        <input type="text" value={newPkgItem.description} onChange={(e) => setNewPkgItem({ ...newPkgItem, description: e.target.value })} placeholder="Açıklama" className="p-2 border border-gray-200 rounded-lg text-sm" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <input type="number" value={newPkgItem.price} onChange={(e) => setNewPkgItem({ ...newPkgItem, price: e.target.value })} placeholder="Fiyat" className="p-2 border border-gray-200 rounded-lg text-sm" />
                        <input type="number" value={newPkgItem.cost} onChange={(e) => setNewPkgItem({ ...newPkgItem, cost: e.target.value })} placeholder="Maliyet" className="p-2 border border-gray-200 rounded-lg text-sm" />
                        <input type="number" value={newPkgItem.quantity} onChange={(e) => setNewPkgItem({ ...newPkgItem, quantity: e.target.value })} placeholder="Adet" className="p-2 border border-gray-200 rounded-lg text-sm" min="1" />
                      </div>
                      <button onClick={addItemToPackage} className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">Pakete Ekle</button>
                    </div>

                    {/* Paket içeriği */}
                    <div className="space-y-2">
                      {editingPackage.items.map((item, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-bold text-sm text-gray-900">{item.name}</div>
                              {item.description && <div className="text-xs text-gray-400">{item.description}</div>}
                              <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                <span>Adet: {item.quantity}</span>
                                <span>Fiyat: <span className="text-green-600 font-bold">{item.price.toLocaleString('tr-TR')}</span></span>
                                <span>Mal: {item.cost.toLocaleString('tr-TR')}</span>
                              </div>
                            </div>
                            <button onClick={() => removeItemFromPackage(idx)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {editingPackage.items.length > 0 && (
                      <button onClick={loadEditingPackageToProposal} className="w-full mt-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                        <Package className="w-4 h-4" /> Teklife Yükle ({editingPackage.items.length} ürün)
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Sol taraftan bir paket seçin veya yeni paket oluşturun
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
