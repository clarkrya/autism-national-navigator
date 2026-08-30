import {
    NextResponse,
  } from "next/server";
  
  
  export async function GET() {
  
    const rawPrivateKey =
      process.env
        .FIREBASE_ADMIN_PRIVATE_KEY;
  
  
    if (
      !rawPrivateKey
    ) {
  
      return NextResponse.json({
        keyExists:
          false,
      });
  
    }
  
  
    const trimmed =
      rawPrivateKey.trim();
  
  
    const normalized =
      trimmed
        .replace(
          /^["']|["']$/g,
          ""
        )
        .replace(
          /\\n/g,
          "\n"
        )
        .trim();
  
  
    return NextResponse.json({
      keyExists:
        true,
  
      rawLength:
        rawPrivateKey.length,
  
      trimmedLength:
        trimmed.length,
  
      normalizedLength:
        normalized.length,
  
      startsCorrectly:
        normalized.startsWith(
          "-----BEGIN PRIVATE KEY-----"
        ),
  
      endsCorrectly:
        normalized.endsWith(
          "-----END PRIVATE KEY-----"
        ),
  
      containsLiteralSlashN:
        rawPrivateKey.includes(
          "\\n"
        ),
  
      containsRealNewline:
        rawPrivateKey.includes(
          "\n"
        ),
  
      containsBeginRsa:
        normalized.includes(
          "-----BEGIN RSA PRIVATE KEY-----"
        ),
  
      containsBeginPrivateKey:
        normalized.includes(
          "-----BEGIN PRIVATE KEY-----"
        ),
    });
  
  }