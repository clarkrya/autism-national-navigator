interface ChildNameProps {
    value: string;
    onChange: (value: string) => void;
  }
  
  export default function ChildName({
    value,
    onChange,
  }: ChildNameProps) {
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
            marginBottom: "20px",
            color: "#0057B8",
          }}
        >
          Let's get to know your family
        </h1>
  
        <p
          style={{
            fontSize: "20px",
            marginBottom: "30px",
            color: "#555",
          }}
        >
          What is your child's first name?
        </p>
  
        <input
          type="text"
          placeholder="Enter first name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "350px",
            padding: "15px",
            fontSize: "18px",
            borderRadius: "10px",
            border: "1px solid #ccc",
          }}
        />
      </div>
    );
  }