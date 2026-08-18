const cards = [
  ["Veo 3.1", "Google cinematic video generation with native audio, 16:9 / 9:16 and up to 4K output."],
  ["Server-side security", "Google credentials remain in the deployment environment and are never sent to the browser or prompt."],
  ["ChatGPT bridge", "The OpenAPI action contract exposes only the NovaForge gateway, never the upstream Google credential."],
];

export default function Home() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "72px 24px" }}>
      <p style={{ letterSpacing: 3, textTransform: "uppercase", opacity: 0.7 }}>NovaForge Studios</p>
      <h1 style={{ fontSize: "clamp(44px, 8vw, 84px)", lineHeight: 0.95, margin: "20px 0" }}>Image Studios</h1>
      <p style={{ maxWidth: 720, fontSize: 20, lineHeight: 1.6, opacity: 0.82 }}>
        Secure provider gateway for NovaForge creative generation. Google Veo 3.1 video support is wired through protected server routes.
      </p>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: 48 }}>
        {cards.map(([title, body]) => (
          <article key={title} style={{ padding: 24, border: "1px solid #293244", borderRadius: 18, background: "#0b1019" }}>
            <h2 style={{ marginTop: 0 }}>{title}</h2>
            <p style={{ lineHeight: 1.6, opacity: 0.78 }}>{body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
