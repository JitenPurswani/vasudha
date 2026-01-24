
export type FontVariant = 'header' | 'content' | 'contentBold';

const fontMap: Record<string, { header: string; content: string, contentBold: string }> = {
  en: { header: 'KronaOne', content: 'OpenSans', contentBold: 'OpenSans-Bold' },
  hi: { header: 'YatraOne', content: 'Poppins', contentBold: 'Poppins-SemiBold' },
  mr: { header: 'YatraOne', content: 'Poppins', contentBold: 'Poppins-SemiBold' },
  ta: { header: 'MuktaMalar', content: 'AnekTamil-Regular', contentBold: 'AnekTamil-Bold' },
  gu: { header: 'AnekGujarati', content: 'NotoSansGujarati-Regular', contentBold: 'NotoSansGujarati-Bold'  },
  bn: { header: 'NotoSansBengali-SemiBold', content: 'NotoSansBengali-Regular', contentBold: 'NotoSansBengali-Bold' },
  ml: { header: 'AnekMalayalam-Bold', content: 'NotoSansMalayalam-Regular', contentBold: 'NotoSansMalayalam-Bold' },
  te: { header: 'NotoSansTelugu-Bold', content: 'NotoSansTelugu-Regular', contentBold: 'NotoSansTelugu-SemiBold' },
  kn: { header: 'NotoSansKannada-SemiBold', content: 'NotoSansKannada-Regular', contentBold: 'NotoSansKannada-SemiBold' },
  pa: { header: 'NotoSansGurmukhi-Bold', content: 'NotoSansGurmukhi-Regular', contentBold: 'NotoSansGurmukhi-SemiBold' },
};
export const getFont = (variant: FontVariant, currentLang: string) => {
  const fonts = fontMap[currentLang] || fontMap.en;
  return fonts[variant];
};