import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ChatLayout from "./components/ChatLayout";

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1a2236",
            color: "#e8ecf1",
            border: "1px solid #1e293b",
            borderRadius: "10px",
            fontSize: "14px",
          },
        }}
      />

      <Routes>
        <Route path="/*" element={<ChatLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
