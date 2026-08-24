//src\app\student\login\types\login.types.ts
export interface HeroContent {
  title: string;
  subtitle: string;
  description: string;
}

export interface PillarContent {
  title: string;
  description: string;
  iconName: string;
}

export interface MetricContent {
  value: string;
  label: string;
  iconName: string;
}

export interface LoginPageData {
  hero: HeroContent;
  pillars: PillarContent[];
  metrics: MetricContent[];
  footerSecurity: string;
}