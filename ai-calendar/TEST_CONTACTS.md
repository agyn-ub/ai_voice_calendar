# Testing Contact Invitations

## Prerequisites

1. **Reconnect Google Calendar**: Since you've already reconnected, you should have the contacts permission. You can verify this by checking if the OAuth scope includes `https://www.googleapis.com/auth/contacts.readonly`

2. **Have Contacts in Google**: Make sure you have some contacts saved in your Google Contacts with email addresses

## Test Page

Navigate to: `http://localhost:3000/test-contacts`

This page provides two main testing sections:
1. Contact Search Test
2. Event Creation with Contacts Test

## Test Scenarios

### Scenario 1: Basic Contact Search
1. Go to the test page
2. Enter a contact name (e.g., "Tom", "John", or any name in your contacts)
3. Click "Search Contacts"
4. Verify:
   - Contact is found with correct email
   - Confidence level is appropriate (exact/high for direct matches)
   - Multiple matches are shown if there are several contacts with similar names

### Scenario 2: Event Creation with Single Contact Name
1. In the assistant chat or test page:
   - Say: "Schedule a meeting with Tom tomorrow at 2pm"
2. Check console logs (F12 → Console):
   ```
   [Contacts] Starting search for: "Tom"
   [Contacts] Found X potential matches
   [Contacts] Match found: Tom Smith (tom.smith@email.com) - Confidence: high
   [OpenAI] Added 1 attendees to event
   ```
3. Verify in Google Calendar:
   - Event is created
   - Tom's email appears in attendees
   - Invitation email is sent to Tom

### Scenario 3: Multiple Attendees (Names and Emails)
1. Create event with mixed attendees:
   - "Create a meeting with Tom, sarah@example.com, and Mike tomorrow at 3pm"
2. Check logs for:
   ```
   [Contacts] Resolving 3 attendees: ["Tom", "sarah@example.com", "Mike"]
   [Contacts] "sarah@example.com" is already an email address
   [Contacts] Looking up contact for: "Tom"
   [Contacts] ✓ Resolved "Tom" to Tom Smith (tom.smith@email.com)
   [Contacts] Looking up contact for: "Mike"
   [Contacts] ✓ Resolved "Mike" to Mike Johnson (mike@email.com)
   ```
3. Verify all attendees receive invitations

### Scenario 4: Contact Not Found
1. Try creating event with non-existent contact:
   - "Schedule meeting with NonExistentPerson tomorrow"
2. Check logs for:
   ```
   [Contacts] Looking up contact for: "NonExistentPerson"
   [Contacts] No results returned from search
   [Contacts] ✗ Could not find contact for: "NonExistentPerson"
   ```
3. Event should still be created (without that attendee)

### Scenario 5: Ambiguous Names
1. If you have multiple contacts with same first name:
   - "Meet with John at 4pm"
2. System should pick the best match based on confidence
3. Check logs to see which John was selected

## Debugging Steps

### If Contacts Aren't Found:

1. **Check Permissions**:
   - Look for error: "Calendar needs to be reconnected with contacts permission"
   - Solution: Disconnect and reconnect Google Calendar

2. **Check Console Logs**:
   ```bash
   # In browser console (F12), you should see:
   [Contacts] Starting search for: "name"
   [Contacts] Sending warmup request...
   [Contacts] Searching for: "name"
   ```

3. **Test Direct API**:
   - Visit: `http://localhost:3000/api/calendar/google/contacts/test?wallet_address=YOUR_WALLET&name=Tom`
   - Should return JSON with matches

### If Invitations Aren't Sent:

1. **Check Event in Google Calendar**:
   - Open the event in Google Calendar
   - Check "Guests" section
   - Verify email addresses are correct

2. **Check Event Creation Response**:
   - In console logs, look for the event creation response
   - Should include `attendees` array with email addresses

3. **Verify Email Settings**:
   - In Google Calendar settings, check notification preferences
   - Ensure "Email guests" is enabled when creating events

## Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "insufficient permissions" error | Disconnect and reconnect Google Calendar |
| Contact not found but exists | Check if contact has email in Google Contacts |
| No invitation emails sent | Check spam folder, verify email in event |
| Wrong contact selected | Use full name instead of first name only |
| Test page shows "not connected" | Ensure wallet is connected first |

## Success Indicators

✅ Console shows: `[Contacts] ✓ Resolved "Name" to Full Name (email@domain.com)`
✅ Google Calendar event shows attendee email addresses
✅ Attendees receive calendar invitation emails
✅ Test page shows matches with confidence scores
✅ Events are created successfully with resolved attendees

## Test Commands for Assistant

Try these commands with the assistant to test different scenarios:

1. **Simple invitation**: 
   - "Schedule a meeting with Tom tomorrow at 2pm"

2. **Multiple attendees**: 
   - "Create a team meeting with Tom, Sarah, and Mike on Friday at 10am"

3. **Mixed format**: 
   - "Set up a call with john@example.com and David next Monday at 3pm"

4. **First name only**: 
   - "Meet with Alex tomorrow at noon"

5. **Full name**: 
   - "Schedule interview with Robert Johnson next week Tuesday at 4pm"

## Monitoring Logs

Run the development server with verbose logging:
```bash
cd ai-calendar
pnpm dev
```

Then monitor the terminal for:
- `[Contacts]` prefixed logs for contact resolution
- `[OpenAI]` prefixed logs for event processing
- Error messages if permissions are missing

The enhanced logging will help you track exactly what's happening during the invitation process.