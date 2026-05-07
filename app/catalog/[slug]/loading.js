"use client";

export default function ProductLoading() {
  return (
    <main style={{ padding: "80px 5vw", display: "grid", gap: 48, gridTemplateColumns: "minmax(0, 3fr) minmax(320px, 2fr)" }}>
      <div
        style={{
          borderRadius: 24,
          width: "100%",
          paddingBottom: "65%",
          background: "#f4f4f4",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 140, height: 12, background: "#f0f0f0", borderRadius: 999 }} />
        <div style={{ width: "70%", height: 40, background: "#efefef", borderRadius: 16 }} />
        <div style={{ width: "90%", height: 16, background: "#f5f5f5", borderRadius: 12 }} />
        <div style={{ width: "80%", height: 16, background: "#f5f5f5", borderRadius: 12 }} />
        <div style={{ width: "60%", height: 30, background: "#f0f0f0", borderRadius: 999, marginTop: 24 }} />
        <div style={{ width: "100%", height: 160, background: "#fafafa", borderRadius: 20 }} />
      </div>
    </main>
  );
}
