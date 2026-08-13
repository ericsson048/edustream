import type Highcharts from 'highcharts';

export type ChartTheme = 'light' | 'dark';

export function chartThemeColors(theme: ChartTheme) {
  const dark = theme === 'dark';
  return {
    axisLabel: dark ? '#94a3b8' : '#64748b',
    gridLine: dark ? '#334155' : '#e2e8f0',
    tooltipBg: dark ? '#1e293b' : '#ffffff',
    tooltipBorder: dark ? '#334155' : '#e2e8f0',
    tooltipText: dark ? '#e2e8f0' : '#1e293b',
    legendText: dark ? '#cbd5e1' : '#334155',
  };
}

export function baseChartTheme(theme: ChartTheme): Highcharts.Options {
  const colors = chartThemeColors(theme);
  return {
    chart: {
      backgroundColor: 'transparent',
      style: { fontFamily: 'inherit' },
    },
    credits: { enabled: false },
    title: { text: undefined },
    legend: {
      itemStyle: { color: colors.legendText },
      itemHoverStyle: { color: colors.legendText },
    },
    tooltip: {
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      style: { color: colors.tooltipText },
    },
  };
}
