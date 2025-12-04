import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = "primary", 
  size = "md",
  className = "",
  disabled,
  ...props 
}) => {
  const baseStyles = "font-bold rounded-lg transition-all duration-200 active:scale-95 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-900/20 disabled:bg-slate-600 disabled:text-slate-400",
    secondary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 disabled:bg-slate-600",
    danger: "bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-900/20 disabled:bg-slate-600",
    ghost: "bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700"
  };

  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-6 py-2 text-base",
    lg: "px-8 py-3 text-lg",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'cursor-not-allowed opacity-50 shadow-none' : ''}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;