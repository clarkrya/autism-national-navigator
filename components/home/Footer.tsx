import Link from "next/link";

import Container from "../ui/Container";


export default function Footer() {

  return (

    <footer
      style={{
        background:
          "#0F172A",

        color:
          "#CBD5E1",

        padding:
          "56px 20px 32px",
      }}
    >

      <Container>

        <div
          style={{
            textAlign:
              "center",
          }}
        >

          {/* ==================================================
              BRAND
          =================================================== */}

          <h3
            style={{
              color:
                "#FFFFFF",

              margin:
                "0 0 14px",

              fontSize:
                "24px",

              fontWeight:
                800,
            }}
          >
            Myriad Autism Journey
          </h3>


          <p
            style={{
              color:
                "#CBD5E1",

              margin:
                "0 auto 24px",

              maxWidth:
                "600px",

              lineHeight:
                1.7,
            }}
          >
            Embracing the countless ways we thrive.
          </p>


          {/* ==================================================
              FOOTER NAVIGATION
          =================================================== */}

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "center",

              alignItems:
                "center",

              gap:
                "24px",

              flexWrap:
                "wrap",

              marginBottom:
                "32px",
            }}
          >

            <Link
              href="/journey"

              style={{
                color:
                  "#CBD5E1",

                textDecoration:
                  "none",

                fontWeight:
                  600,
              }}
            >
              My Journey
            </Link>


            <Link
              href="/community"

              style={{
                color:
                  "#CBD5E1",

                textDecoration:
                  "none",

                fontWeight:
                  600,
              }}
            >
              Community
            </Link>


            <Link
              href="/pricing"

              style={{
                color:
                  "#CBD5E1",

                textDecoration:
                  "none",

                fontWeight:
                  600,
              }}
            >
              Pricing
            </Link>


            <Link
              href="/login"

              style={{
                color:
                  "#CBD5E1",

                textDecoration:
                  "none",

                fontWeight:
                  600,
              }}
            >
              Log In
            </Link>

          </div>


          {/* ==================================================
              COPYRIGHT
          =================================================== */}

          <div
            style={{
              borderTop:
                "1px solid rgba(148, 163, 184, 0.2)",

              paddingTop:
                "24px",
            }}
          >

            <p
              style={{
                fontSize:
                  "13px",

                color:
                  "#94A3B8",

                margin:
                  0,
              }}
            >
              © {new Date().getFullYear()} Myriad Autism
              Journey. All rights reserved.
            </p>

          </div>

        </div>

      </Container>

    </footer>

  );

}