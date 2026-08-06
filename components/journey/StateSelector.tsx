interface StateSelectorProps {
    value: string;
    onChange: (value: string) => void;
  }
  
  const states = [
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming",
  ];
  
  export default function StateSelector({
    value,
    onChange,
  }: StateSelectorProps) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 20px",
        }}
      >
        <h1
          style={{
            fontSize: "42px",
            color: "#0057B8",
            marginBottom: "20px",
          }}
        >
          Where do you live?
        </h1>
  
        <p
          style={{
            fontSize: "20px",
            color: "#555",
            marginBottom: "30px",
          }}
        >
          Select your state so we can personalize your resources.
        </p>
  
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "350px",
            padding: "14px",
            fontSize: "18px",
            borderRadius: "10px",
            border: "1px solid #D1D5DB",
          }}
        >
          <option value="">Select your state...</option>
  
          {states.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>
    );
  }