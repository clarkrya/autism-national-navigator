import CommunityProfileForm from "../../../components/community/CommunityProfileForm";


/*
 * ============================================================
 * COMMUNITY PROFILE PAGE
 * ============================================================
 */

export default function CommunityProfilePage() {

  return (

    <main
      style={{
        minHeight:
          "100vh",

        background:
          "#F8FAFC",

        padding:
          "35px 0 90px",
      }}
    >

      <CommunityProfileForm />

    </main>

  );

}