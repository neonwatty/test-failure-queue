// Simulated test output with failures
const output = `
  FAIL src/components/Button.test.js
    ● Button › should render correctly
      
      Expected: "Click me"
      Received: "Click"
      
      at src/components/Button.test.js:15:5
      at src/components/Button.js:10:3
      
  FAIL src/utils/math.spec.ts
    ● Math utils › should add numbers
      
      at src/utils/math.spec.ts:8:10
      at src/utils/math.ts:5:15
`;

console.log("Test files that should be captured:");
console.log("- src/components/Button.test.js");
console.log("- src/utils/math.spec.ts");
console.log("\nImplementation files that should be filtered out:");
console.log("- src/components/Button.js");
console.log("- src/utils/math.ts");
