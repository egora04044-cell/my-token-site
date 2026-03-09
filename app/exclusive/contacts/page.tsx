'use client';

export default function ContactsPage() {
  return (
    <section className="min-h-screen px-6 py-16 lg:py-24">
      <h1 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] font-semibold text-[var(--foreground)] mb-2">
        Контакты
      </h1>
      <p className="text-[var(--text-secondary)] max-w-[600px] leading-relaxed">
        Свяжитесь с нами через сообщество или официальные каналы артиста.
      </p>
    </section>
  );
}
