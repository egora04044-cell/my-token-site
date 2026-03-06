/**
 * Адреса Phantom кошельков с правами администратора.
 * Добавьте сюда свой адрес для доступа к /admin
 */
export const ADMIN_ADDRESSES: string[] = [
  'HhrdvpD6LNndQLDwHm9pymcZfurfDuj8jz9WMSBY3nM6',
  '4WrcTEw9nLxZTgBhaopRJv3qZQ2kTCoRhaGiX6NuJnVB',
];

export function isAdmin(address: string | null | undefined): boolean {
  if (!address) return false;
  return ADMIN_ADDRESSES.includes(address);
}
