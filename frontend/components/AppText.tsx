import { FontVariant, getFont } from "@/constants/Typography";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, Text, TextProps, TextStyle } from "react-native";

type AppTextProps = TextProps & {
  variant?: FontVariant;
  bold?: boolean;
};

export const AppText = ({ variant = "content", bold, style, ...props }: AppTextProps) => {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';
  
  const fontFamily = getFont(variant, lang);

  const flattenedStyle = StyleSheet.flatten(style);
  const baseFontSize = flattenedStyle?.fontSize || (variant === 'header' ? 16 : 14);

  let scale = 1.0;
  let lineHeightMultiplier = 1.4;

  if (lang === 'ta') {
    variant === 'header' ? scale = 0.88 : 1.0; 
    lineHeightMultiplier = 1.3; 
  } else if (lang === 'hi' || lang === 'mr') {
    scale = 1.20; 
    lineHeightMultiplier = 1.4; 
  }
  else if(lang === 'gu')
  {
    variant === 'header' ? scale = 1.2 : 0.9;
  }
  else if(lang === 'te')
  {
    scale = 0.8;
  }

  const finalFontSize = variant === 'header' ? baseFontSize * 1.3 : baseFontSize * scale;

  const languageStyles: TextStyle = {
    fontFamily,
    fontSize: finalFontSize,
    lineHeight: finalFontSize * lineHeightMultiplier,
    paddingTop: Platform.OS === 'android' ? (lang === 'ta' ? 0 : 2) : 0,
    fontWeight: bold ? 'bold' : 'normal', 
  };
  return <Text {...props} style={[style, languageStyles]} />;
};