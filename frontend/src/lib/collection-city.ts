// A property address may name both a prefecture and a county-level destination.
export function collectionCity(location = ''): string {
  const address = location.normalize('NFKC').replace(/\s+/g, '').replace(/^中国/, '')
    .replace(/^(?:[\p{Script=Han}]{2,8}?省|内蒙古自治区|广西壮族自治区|西藏自治区|宁夏回族自治区|新疆维吾尔自治区)/u, '');
  const city = address.match(/^([\p{Script=Han}]{2,8}?)市(?!场)/u);
  if (city) {
    const countyCity = address.slice(city[0].length).match(/^([\p{Script=Han}]{2,8}?)市(?!场)/u);
    return countyCity?.[1] ?? city[1];
  }
  // Common short addresses in property profiles omit the administrative suffix.
  const prefix = address.match(/^(北京|天津|上海|重庆|无锡|太仓|腾冲|丽江|南京|苏州|杭州|成都|广州|深圳|大理|昆明|厦门|青岛|武汉|西安)(?!路|街|道)/);
  return prefix?.[1] ?? '';
}
