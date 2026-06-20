// BJJRats PWA — ComingSoon placeholder (extracted from ProfessorPanel)
import React from 'react';

export default function ComingSoon({ icon, title, description, accentColor }: { icon: string; title: string; description: string; accentColor: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <p style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>{icon}</p>
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', color: '#FFF', letterSpacing: '0.06em' }}>{title}</p>
      <p style={{ fontFamily: 'Barlow, sans-serif', fontSize: '0.85rem', color: '#666', margin: '0.75rem auto 0', maxWidth: '340px', textAlign: 'center' }}>{description}</p>
      <div style={{ marginTop: '1.5rem', width: '48px', height: '4px', background: accentColor, margin: '1.5rem auto 0' }} />
    </div>
  );
}
