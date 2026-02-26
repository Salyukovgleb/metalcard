import Link from "next/link";

export function SiteFooter() {
  return (
    <footer>
      <span>© 2022 MetalCards</span>
      <Link href="/privacy-policy">политика конфиденциальности</Link>
      <Link href="/user-agreement">пользовательское соглашение</Link>
      <a href="https://www.instagram.com/metalcards.uz?utm_medium=copy_link">instagram</a>
      <a href="http://tiktok.com/@metalcardsuz">tik tok</a>
      <a href="https://t.me/metalcardsuz">telegram</a>
    </footer>
  );
}
