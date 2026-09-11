import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]';
    const variants = {
      primary: 'bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:shadow-md hover:bg-destructive/90',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      outline: 'border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/40',
    };
    const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-9 px-4 py-2 text-sm', lg: 'h-11 px-8 text-base' };
    return <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
  }
);
Button.displayName = 'Button';
export { Button };
