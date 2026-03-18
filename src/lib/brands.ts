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
  address: string[];
  phone: string;
  email: string;
  website: string;
  qrUrl: string;
  slogan: string;
  brandLogos: string[];
}

export const BRANDS: Record<string, BrandConfig> = {
  mutpro: {
    id: 'mutpro',
    name: 'MutPro',
    fullName: 'MUTPRO',
    logo: 'https://mutpro.com/logo-beyaz.png',
    primaryColor: 'bg-[#040023]',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    headerBg: 'bg-[#040023]',
    headerText: 'text-white',
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
      'https://www.oztiryakiler.com.tr/images/oztiryakiler-logo.png',
      'https://ugfryer.com/wp-content/uploads/2023/01/ug-logo.png',
      'https://dfryer.com.tr/wp-content/uploads/2023/01/logo.png',
    ],
  },
  guclumutfak: {
    id: 'guclumutfak',
    name: 'Güçlü Mutfak',
    fullName: 'GÜÇLÜ MUTFAK',
    logo: 'https://cdn.myikas.com/images/theme-images/4036443e-0fdf-43fc-9903-6a4ba22635d4/image_540.webp',
    primaryColor: 'bg-red-600',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    headerBg: 'bg-white',
    headerText: 'text-gray-900',
    address: [
      'Maltepe Mah. Davutpaşa Cad. Tim 1 İş Merkezi.',
      'No:6/24 Zeytinburnu/İstanbul',
    ],
    phone: '0536 592 63 44',
    email: 'info@guclumutfak.com',
    website: 'www.guclumutfak.com',
    qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://www.guclumutfak.com',
    slogan: 'Endüstriyel Mutfak Ekipmanları',
    brandLogos: [],
  },
};

export const getBrand = (brandId: string): BrandConfig => {
  return BRANDS[brandId] || BRANDS.mutpro;
};
