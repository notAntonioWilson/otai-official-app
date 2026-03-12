// PlaceholderPage component

interface PlaceholderPageProps {
  title: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any;
}

export default function PlaceholderPage({ title, description, icon: Icon }: PlaceholderPageProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">{title}</h1>
      <div className="bg-otai-dark border border-otai-border rounded-xl p-12 text-center">
        {Icon && <Icon size={48} className="text-otai-text-muted mx-auto mb-4" />}
        <p className="text-otai-text-secondary">{description}</p>
      </div>
    </div>
  );
}
