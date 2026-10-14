import { paths } from '../lib/router';
import { t } from '../i18n/tr';
import { Link } from './Link';
import { IconCompass, IconGear, IconMap, IconUser } from './icons';

export type Tab = 'map' | 'discover' | 'profile' | 'settings' | null;

/** Bottom tab bar on phones, left rail on desktop. */
export function BottomNav({ current }: { current: Tab }) {
  const items = [
    { key: 'map' as const, href: paths.map(), label: t.navMap, Icon: IconMap },
    { key: 'discover' as const, href: paths.discover(), label: t.navDiscover, Icon: IconCompass },
    { key: 'profile' as const, href: paths.profile(), label: t.navProfile, Icon: IconUser },
    { key: 'settings' as const, href: paths.settings(), label: t.navSettings, Icon: IconGear },
  ];
  return (
    <nav className="tabbar" aria-label={t.mainNav}>
      <span className="tabbar__brand" aria-hidden="true">
        {t.appName}
      </span>
      {items.map(({ key, href, label, Icon }) => (
        <Link key={key} href={href} className="tabbar__item" aria-current={current === key ? 'page' : undefined}>
          <Icon filled={current === key} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
