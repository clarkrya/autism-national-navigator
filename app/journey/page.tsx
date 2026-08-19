import JourneyBuilder from "../../components/journey/JourneyBuilder";
import JourneyHistory from "../../components/journey/JourneyHistory";
import RoadmapTimeline from "../../components/journey/RoadmapTimeline";


export default function JourneyPage() {

  return (

    <main
      style={{
        maxWidth:
          "1200px",

        margin:
          "0 auto",

        padding:
          "40px 24px 100px",
      }}
    >

      <JourneyBuilder />


      <JourneyHistory />


      <RoadmapTimeline />

    </main>
  );
}