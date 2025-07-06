export const UI = () => {
  return (
    <section className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div className="absolute top-4 left-4 md:top-8 md:left-14 opacity-0 animate-fade-in-down animation-delay-200 pointer-events-auto">
        <a href="https://wawasensei.dev" target="_blank">
          <img
            src="/images/wawasensei-white.png"
            alt="Wawa Sensei logo"
            className="w-20 h-20 object-contain"
          />
        </a>
      </div>
      {/* Removed pop star text */}
    </section>
  );
};
