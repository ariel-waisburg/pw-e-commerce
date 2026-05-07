"use client";

export default function CatalogLoading() {
  return (
    <main style={{ padding: "80px 5vw" }}>
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            width: 180,
            height: 12,
            background: "#f0f0f0",
            borderRadius: 999,
            marginBottom: 12,
          }}
        />
        <div
          style={{
            width: "40%",
            height: 40,
            background: "#f0f0f0",
            borderRadius: 12,
            marginBottom: 16,
          }}
        />
        <div
          style={{
            width: "60%",
            height: 16,
            background: "#f5f5f5",
            borderRadius: 12,
          }}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 24,
        }}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            style={{
              borderRadius: 20,
              border: "1px solid #f0f0f0",
              padding: 16,
              background: "#fff",
            }}
          >
            <div
              style={{
                width: "100%",
                height: 180,
                borderRadius: 16,
                background: "#f5f5f5",
                marginBottom: 12,
              }}
            />
            <div
              style={{
                width: "65%",
                height: 20,
                background: "#f0f0f0",
                borderRadius: 8,
                marginBottom: 8,
              }}
            />
            <div
              style={{
                width: "45%",
                height: 16,
                background: "#f5f5f5",
                borderRadius: 8,
              }}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
