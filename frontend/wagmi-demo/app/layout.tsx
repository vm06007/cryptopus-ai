import "../styles/globals.css";

import Providers from "components/providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <link rel="icon" type="image/x-icon" href="/favicon.svg" />
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
