import "./globals.css";
import Menu from "./components/Menu";

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <Menu />

        {children}
      </body>
    </html>
  );
}
