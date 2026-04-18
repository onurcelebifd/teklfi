export interface BrandConfig {
  id: string;
  name: string;
  fullName: string;
  logo: string;
  primaryColor: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  headerBg: string;
  headerText: string;
  buttonColor: string;
  sidebarBg: string;
  accentColor: string;
  address: string[];
  phone: string;
  email: string;
  website: string;
  qrUrl: string;
  slogan: string;
  brandLogos: string[];
  tableHeaderBg: string;
  tableHeaderText: string;
  tableStripeBg: string;
  tableBorderColor: string;
  tableHeaderBgHex: string;
  tableHeaderTextHex: string;
  tableStripeBgHex: string;
  tableBorderHex: string;
  proposalHeaderBg: string;
  proposalHeaderText: string;
  logoDark?: string;
}

export const BRANDS: Record<string, BrandConfig> = {
  mutpro: {
    id: 'mutpro',
    name: 'MutPro',
    fullName: 'MUTPRO',
    logo: '/logos/mutpro-mavi-logo.jpeg',
    primaryColor: 'bg-[#040023]',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    headerBg: 'bg-[#040023]',
    headerText: 'text-white',
    buttonColor: 'bg-[#040023]',
    sidebarBg: 'bg-[#040023]',
    accentColor: '#040023',
    address: [
      'Balaç Mahallesi Recep Tayyip Erdoğan Bulvarı',
      'No:114 Atakum / Samsun',
    ],
    phone: '0546 936 18 55',
    email: 'info@mutpro.com',
    website: 'www.mutpro.com',
    qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://www.mutpro.com',
    slogan: 'ENDÜSTRİYEL MUTFAK EKİPMANLARI',
    brandLogos: [
      '/logos/brands/oztiryakiler.svg',
      '/logos/brands/empero.svg',
      '/logos/brands/inoksan.svg',
      '/logos/brands/samixir.svg',
      '/logos/brands/lacimbali.svg',
      '/logos/brands/vosco.svg',
      '/logos/brands/remta.svg',
      '/logos/brands/nuovasimonelli.svg',
      '/logos/brands/ndustrio.svg',
      '/logos/brands/kalitegaz.svg',
    ],
    tableHeaderBg: 'bg-orange-500',
    tableHeaderText: 'text-[#040023]',
    tableStripeBg: 'bg-orange-50',
    tableBorderColor: 'border-orange-200',
    tableHeaderBgHex: '#f97316',
    tableHeaderTextHex: '#ffffff',
    tableStripeBgHex: '#ffffff',
    tableBorderHex: '#fed7aa',
    proposalHeaderBg: '#040023',
    proposalHeaderText: '#ffffff',
    logoDark: 'https://cdn.myikas.com/images/theme-images/28f96c57-de53-42dc-96e5-988cf858f78b/image_540.webp',
  },
  guclumutfak: {
    id: 'guclumutfak',
    name: 'Güçlü Mutfak',
    fullName: 'GÜÇLÜ MUTFAK',
    logo: '/logos/guclumutfak-logo.png',
    primaryColor: 'bg-red-600',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    headerBg: 'bg-red-600',
    headerText: 'text-white',
    buttonColor: 'bg-red-600',
    sidebarBg: 'bg-red-600',
    accentColor: '#dc2626',
    address: [
      'Maltepe Mah. Davutpaşa Cad. Tim 1 İş Merkezi.',
      'No:6/24 Zeytinburnu/İstanbul',
    ],
    phone: '0536 592 63 44',
    email: 'info@guclumutfak.com',
    website: 'www.guclumutfak.com',
    qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://www.guclumutfak.com',
    slogan: 'Endüstriyel Mutfak Ekipmanları',
    brandLogos: [
      '/logos/brands/oztiryakiler.svg',
      '/logos/brands/empero.svg',
      '/logos/brands/inoksan.svg',
      '/logos/brands/samixir.svg',
      '/logos/brands/lacimbali.svg',
      '/logos/brands/vosco.svg',
      '/logos/brands/remta.svg',
      '/logos/brands/nuovasimonelli.svg',
      '/logos/brands/ndustrio.svg',
      '/logos/brands/kalitegaz.svg',
    ],
    tableHeaderBg: 'bg-red-600',
    tableHeaderText: 'text-white',
    tableStripeBg: 'bg-red-50',
    tableBorderColor: 'border-red-200',
    tableHeaderBgHex: '#dc2626',
    tableHeaderTextHex: '#ffffff',
    tableStripeBgHex: '#fef2f2',
    tableBorderHex: '#fecaca',
    proposalHeaderBg: '#ffffff',
    proposalHeaderText: '#111827',
  },
};

export const getBrand = (brandId: string): BrandConfig => {
  return BRANDS[brandId] || BRANDS.mutpro;
};
