// Clickable demo expressions for the fixed server-side model (Company/Person/Role).
// They only fill and submit the form; the server alone decides what is a valid result.

export type OclExample = { title: string; expression: string };

export const VALID_EXAMPLES: OclExample[] = [
  {
    title: 'Sum of squares',
    expression: 'Set{1,2,3}->collect(i | i * i)->sum()',
  },
  { title: 'Sum of a range', expression: 'Sequence{1..100}->sum()' },
  { title: 'Number of persons', expression: 'Person.allInstances()->size()' },
  {
    title: 'All names',
    expression: 'Person.allInstances()->collect(p | p.name)->asSet()',
  },
  {
    title: 'Salary above 5000',
    expression:
      'Person.allInstances()->select(p | p.salary > 5000)->collect(p | p.name)->asSet()',
  },
  {
    title: 'Managers (enum)',
    expression:
      'Person.allInstances()->select(p | p.role = Role::Manager)->collect(p | p.name)',
  },
  {
    title: 'Model operation isAdult()',
    expression:
      'Person.allInstances()->select(p | p.isAdult())->collect(p | p.name)',
  },
  {
    title: 'Invariant adultsOnly',
    expression: 'Person.allInstances()->forAll(p | p.age >= 18)',
  },
  {
    title: 'Employees of the company',
    expression: 'Company.allInstances()->any(true).employees->size()',
  },
];

export const ERROR_EXAMPLES: OclExample[] = [
  { title: 'Syntax error', expression: 'Set{1,2' },
  {
    title: 'Unknown attribute',
    expression: 'Person.allInstances()->collect(p | p.nope)',
  },
  { title: 'Unknown class', expression: 'Student.allInstances()' },
  { title: 'Type error', expression: "1 + 'a'" },
  { title: 'Range too large', expression: 'Sequence{1..2000000000}->size()' },
  {
    title: 'Range bound not a literal',
    expression: 'Sequence{1..Person.allInstances()->size()}->size()',
  },
  { title: 'Division by zero', expression: '1 / 0' },
  {
    title: 'Timeout (takes about 3 s)',
    expression:
      'Sequence{1..5000}->forAll(a | Sequence{1..5000}->forAll(b | Sequence{1..5000}->forAll(c | a + b + c > 0)))',
  },
];
