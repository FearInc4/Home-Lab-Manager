import { getServiceConfig } from '@/lib/service-utils';

interface ServiceIconProps {
  type: string;
  className?: string;
  size?: number;
}

export function ServiceIcon({ type, className = '', size = 20 }: ServiceIconProps) {
  const config = getServiceConfig(type);
  const Icon = config.icon;
  
  return (
    <Icon 
      className={className} 
      size={size}
      style={{ color: config.color }}
    />
  );
}
