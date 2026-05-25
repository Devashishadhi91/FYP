import React, { useEffect, useState, useCallback } from "react";
import axiosInstance from "../lib/axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { FiArrowLeft, FiBox, FiTrendingUp } from "react-icons/fi";

const PALETTE = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
  "#06b6d4", "#a855f7", "#e11d48", "#22c55e", "#0ea5e9",
];

/* ── Custom Tooltip rendered by Recharts ── */
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.92)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        padding: "12px 16px",
        color: "#f8fafc",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        minWidth: 200,
        backdropFilter: "blur(8px)",
      }}
    >
      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: d.fill }}>
        {d.category}
      </p>
      <p style={{ fontSize: 12, margin: "3px 0" }}>
        Total Quantity: <strong>{d.totalQuantity.toLocaleString()}</strong>
      </p>
      <p style={{ fontSize: 12, margin: "3px 0" }}>
        Products: <strong>{d.productCount}</strong>
      </p>
      <p style={{ fontSize: 12, margin: "3px 0" }}>
        Stock Value: <strong>Rs. {d.totalValue.toLocaleString()}</strong>
      </p>
      <p style={{ fontSize: 11, marginTop: 8, color: "#94a3b8", fontStyle: "italic" }}>
        Click to see top products →
      </p>
    </div>
  );
};

/* ── Custom Legend ── */
const CustomLegend = ({ payload, onSelect, selectedCategory }) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "8px 12px",
      justifyContent: "center",
      marginTop: 8,
    }}
  >
    {payload.map((entry, i) => (
      <button
        key={i}
        onClick={() => onSelect(entry.payload)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background:
            selectedCategory?.category === entry.payload.category
              ? "rgba(99,102,241,0.15)"
              : "rgba(241,245,249,0.7)",
          border: `1.5px solid ${selectedCategory?.category === entry.payload.category
            ? entry.color
            : "transparent"
            }`,
          borderRadius: 20,
          padding: "4px 10px",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          color: "#334155",
          transition: "all 0.2s",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: entry.color,
            flexShrink: 0,
          }}
        />
        {entry.value}
      </button>
    ))}
  </div>
);

/* ── Drill-down: Top 5 Products for a Category ── */
const CategoryDrillDown = ({ categoryData, color, onBack }) => {
  const max = categoryData.topProducts[0]?.quantity || 1;

  return (
    <div style={{ width: "100%", padding: "4px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button
          onClick={onBack}
          id="pie-back-btn"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: `2px solid ${color}`,
            background: "white",
            cursor: "pointer",
            color: color,
            fontSize: 16,
            transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = color;
            e.currentTarget.style.color = "white";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "white";
            e.currentTarget.style.color = color;
          }}
          title="Back to categories"
        >
          <FiArrowLeft />
        </button>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
            Top 5 Products
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontWeight: 600 }}>
            Category: <span style={{ color }}>{categoryData.category}</span>
          </p>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>
            Total Stock
          </p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color }}>
            {categoryData.totalQuantity.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Summary badges */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "Products", value: categoryData.productCount },
          { label: "Stock Value", value: `Rs. ${categoryData.totalValue.toLocaleString()}` },
        ].map((b, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: 120,
              background: `linear-gradient(135deg, ${color}18, ${color}08)`,
              border: `1px solid ${color}30`,
              borderRadius: 12,
              padding: "10px 14px",
            }}
          >
            <p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 600 }}>
              {b.icon} {b.label}
            </p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
              {b.value}
            </p>
          </div>
        ))}
      </div>

      {/* Product bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {categoryData.topProducts.length === 0 ? (
          <p style={{ textAlign: "center", color: "#94a3b8", fontStyle: "italic", padding: "20px 0" }}>
            No products found in this category.
          </p>
        ) : (
          categoryData.topProducts.map((p, idx) => {
            const pct = Math.round((p.quantity / max) * 100);
            return (
              <div key={idx} id={`top-product-${idx}`}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#334155",
                      maxWidth: "70%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={p.name}
                  >
                    #{idx + 1} {p.name}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800, color }}>
                    {p.quantity.toLocaleString()} units
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: "#f1f5f9",
                    borderRadius: 99,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                      borderRadius: 99,
                      transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                  />
                </div>
                <p style={{ margin: "2px 0 0", fontSize: 10, color: "#94a3b8" }}>
                  MRP: Rs. {(p.MRP || p.Price || 0).toLocaleString()}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/* ── Main Component ── */
function Gettopproduct() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axiosInstance.get("/product/category-stock-distribution", {
        withCredentials: true,
      });
      setCategories(res.data.categories || []);
    } catch (err) {
      setError("Failed to load category data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pieData = categories.map((cat, i) => ({
    name: cat.category,
    value: cat.totalQuantity,
    // flatten all fields for tooltip access
    category: cat.category,
    totalQuantity: cat.totalQuantity,
    totalValue: cat.totalValue,
    productCount: cat.productCount,
    topProducts: cat.topProducts,
    fill: PALETTE[i % PALETTE.length],
  }));

  const handleSliceClick = (data) => {
    if (data) {
      setSelectedCategory(data);
    }
  };

  const handleLegendSelect = (catPayload) => {
    setSelectedCategory(catPayload);
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 320,
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "3px solid #6366f1",
            borderTopColor: "transparent",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>
          Loading chart data…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 320,
          color: "#ef4444",
          gap: 8,
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 700 }}>{error}</p>
        <button
          onClick={fetchData}
          style={{
            padding: "6px 16px",
            background: "#ef444415",
            border: "1px solid #ef4444",
            borderRadius: 8,
            color: "#ef4444",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 320,
          color: "#94a3b8",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        No category data available.
      </div>
    );
  }

  /* ── Drill-down view ── */
  if (selectedCategory) {
    const colorIdx = pieData.findIndex((d) => d.category === selectedCategory.category);
    const color = PALETTE[colorIdx % PALETTE.length];
    return (
      <CategoryDrillDown
        categoryData={selectedCategory}
        color={color}
        onBack={() => setSelectedCategory(null)}
      />
    );
  }

  /* ── Pie chart view ── */
  return (
    <div style={{ width: "100%" }}>
      <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, fontStyle: "italic", textAlign: "center" }}>
        Hover for details · Click to explore
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
            onClick={handleSliceClick}
            onMouseEnter={(_, idx) => setActiveIndex(idx)}
            onMouseLeave={() => setActiveIndex(null)}
            style={{ cursor: "pointer" }}
          >
            {pieData.map((entry, idx) => (
              <Cell
                key={`cell-${idx}`}
                fill={entry.fill}
                opacity={activeIndex === null || activeIndex === idx ? 1 : 0.55}
                style={{
                  filter:
                    activeIndex === idx
                      ? `drop-shadow(0 0 8px ${entry.fill}80)`
                      : "none",
                  transform: activeIndex === idx ? "scale(1.04)" : "scale(1)",
                  transformOrigin: "center",
                  transition: "all 0.25s",
                }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            content={
              <CustomLegend
                onSelect={handleLegendSelect}
                selectedCategory={selectedCategory}
              />
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Gettopproduct;
