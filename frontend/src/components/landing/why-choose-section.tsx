import { ClockIcon, UsersIcon, ShieldIcon } from "./icons"

export function WhyChooseSection() {
  const features = [
    {
      icon: ClockIcon,
      title: "Easy booking",
      description: "Book your study space in seconds with our simple reservation system."
    },
    {
      icon: UsersIcon,
      title: "Various Space",
      description: "Choose from individual desks, group rooms, or quiet zones."
    },
    {
      icon: ShieldIcon,
      title: "Secure & Reliable",
      description: "Guaranteed reservations with our reliable booking system."
    }
  ]

  return (
    <section className="py-20 text-center bg-background">
      <div className="container max-w-[1100px] mx-auto px-5">
        <h2
          className="text-3xl md:text-4xl lg:text-5xl font-bold mb-14 text-foreground"
          style={{ fontFamily: 'var(--font-heading, Orbitron, sans-serif)' }}
        >
          Why choose SCAMS?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-7 text-left">
          {features.map((feature, index) => {
            const IconComponent = feature.icon
            return (
              <div
                key={index}
                className="bg-card/10 dark:bg-card/5 rounded-xl p-7 border border-border/20"
              >
                <div className="bg-muted rounded-xl p-5 mb-5 inline-block">
                  <div className="border-2 border-foreground rounded-lg w-[60px] h-[60px] flex justify-center items-center text-foreground">
                    <IconComponent className="w-8 h-8" />
                  </div>
                </div>
                <h3
                  className="text-xl md:text-2xl mb-2.5 font-bold text-foreground"
                  style={{ fontFamily: 'var(--font-heading, Orbitron, sans-serif)' }}
                >
                  {feature.title}
                </h3>
                <p className="leading-relaxed text-muted-foreground font-light">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}