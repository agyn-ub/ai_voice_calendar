// Usage Example: OpenAI GPT-5-mini with Google Calendar
// Shows how the system adapts based on user permissions

import { createOpenAICalendarIntegration } from './openai-calendar-integration';

// Example 1: User with READ-ONLY permissions
async function exampleReadOnlyUser() {
  console.log('\n=== READ-ONLY USER EXAMPLE ===');
  
  const readOnlyScopes = [
    'userinfo.email',
    'userinfo.profile', 
    'calendar.events.readonly'
  ];
  
  const integration = createOpenAICalendarIntegration(
    process.env.OPENAI_API_KEY!,
    'token_readonly_123',
    readOnlyScopes
  );

  // User tries to create an event (will fail gracefully)
  const createRequest = await integration.processRequest(
    "Schedule a meeting with John tomorrow at 3pm",
    'session_001'
  );
  
  console.log('Create Request (Read-Only User):');
  console.log('- Can Execute:', createRequest.canExecute); // false
  console.log('- Response:', createRequest.naturalResponse); // Permission denied message
  console.log('- Fallback:', createRequest.fallbackSuggestion); // Suggests searching instead
  
  // User searches for events (will succeed)
  const searchRequest = await integration.processRequest(
    "What meetings do I have tomorrow?",
    'session_001'
  );
  
  console.log('\nSearch Request (Read-Only User):');
  console.log('- Can Execute:', searchRequest.canExecute); // true
  console.log('- Response:', searchRequest.naturalResponse); // Success message
  console.log('- Available Operations:', searchRequest.availableOperations);
}

// Example 2: User with WRITE permissions
async function exampleWriteUser() {
  console.log('\n=== WRITE-ENABLED USER EXAMPLE ===');
  
  const writeScopes = [
    'userinfo.email',
    'userinfo.profile',
    'calendar.events' // Full read/write access
  ];
  
  const integration = createOpenAICalendarIntegration(
    process.env.OPENAI_API_KEY!,
    'token_write_456',
    writeScopes
  );

  // User creates an event (will succeed)
  const createRequest = await integration.processRequest(
    "Schedule a team meeting for next Monday at 10am for 1 hour",
    'session_002'
  );
  
  console.log('Create Request (Write User):');
  console.log('- Can Execute:', createRequest.canExecute); // true
  console.log('- Response:', createRequest.naturalResponse); // Success message
  console.log('- Intent:', createRequest.intent);
  
  // Execute the operation
  if (createRequest.canExecute) {
    const result = await integration.executeOperation(createRequest);
    console.log('- Operation Result:', result);
  }
  
  // User updates an event
  const updateRequest = await integration.processRequest(
    "Change my 3pm meeting to 4pm",
    'session_002'
  );
  
  console.log('\nUpdate Request (Write User):');
  console.log('- Can Execute:', updateRequest.canExecute); // true
  console.log('- Response:', updateRequest.naturalResponse);
  
  // User deletes an event
  const deleteRequest = await integration.processRequest(
    "Cancel my meeting with Sarah",
    'session_002'
  );
  
  console.log('\nDelete Request (Write User):');
  console.log('- Can Execute:', deleteRequest.canExecute); // true
  console.log('- Response:', deleteRequest.naturalResponse);
  console.log('- Available Operations:', deleteRequest.availableOperations);
}

// Example 3: Dynamic permission checking
async function exampleDynamicPermissions() {
  console.log('\n=== DYNAMIC PERMISSION EXAMPLE ===');
  
  // Simulate user granting permissions progressively
  let currentScopes = ['calendar.events.readonly'];
  
  const integration = createOpenAICalendarIntegration(
    process.env.OPENAI_API_KEY!,
    'token_dynamic_789',
    currentScopes
  );
  
  // First attempt - read only
  let response = await integration.processRequest(
    "Add lunch with client at noon on Friday",
    'session_003'
  );
  
  console.log('First Attempt (Read-Only):');
  console.log('- Can Execute:', response.canExecute); // false
  console.log('- Suggestion:', response.fallbackSuggestion);
  
  // User grants write permissions
  console.log('\n[User grants write permissions...]');
  currentScopes = ['calendar.events']; // Full access
  
  // Reinitialize with new permissions
  integration.initializeWithPermissions('token_dynamic_789', currentScopes);
  
  // Second attempt - with write permissions
  response = await integration.processRequest(
    "Add lunch with client at noon on Friday",
    'session_003'
  );
  
  console.log('\nSecond Attempt (Write-Enabled):');
  console.log('- Can Execute:', response.canExecute); // true
  console.log('- Response:', response.naturalResponse);
  console.log('- Token ID:', response.tokenId);
}

// Example 4: Voice input processing
async function exampleVoiceInput() {
  console.log('\n=== VOICE INPUT EXAMPLE ===');
  
  const integration = createOpenAICalendarIntegration(
    process.env.OPENAI_API_KEY!,
    'token_voice_101',
    ['calendar.events']
  );
  
  // Simulate various voice commands
  const voiceCommands = [
    "Show me what's on my calendar today",
    "Book a dentist appointment next Tuesday at 2 PM",
    "Cancel all my meetings after 5 PM",
    "When is my next meeting with the marketing team?",
    "Move my 3 o'clock to tomorrow same time",
    "Add John and Sarah to Monday's standup"
  ];
  
  for (const command of voiceCommands) {
    const response = await integration.processRequest(command, 'voice_session');
    console.log(`\nVoice: "${command}"`);
    console.log(`- Intent: ${response.intent.intent}`);
    console.log(`- Can Execute: ${response.canExecute}`);
    console.log(`- Response: ${response.naturalResponse}`);
  }
}

// Main execution
async function main() {
  try {
    await exampleReadOnlyUser();
    await exampleWriteUser();
    await exampleDynamicPermissions();
    await exampleVoiceInput();
  } catch (error) {
    console.error('Error in examples:', error);
  }
}

// Run examples
if (require.main === module) {
  main();
}

export { 
  exampleReadOnlyUser,
  exampleWriteUser,
  exampleDynamicPermissions,
  exampleVoiceInput
};