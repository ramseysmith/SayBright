# Reply to App Review, Submission 4f5e5dd4-3ef0-416e-985f-48541fc07ac6

Guideline 5.1.1(ii), microphone purpose string.
Paste into the App Store Connect message thread.

---

Hello,

Thank you for the review of build 11. We have updated the microphone purpose
string, which was still the default placeholder text and did not explain the
use of the resource.

The new NSMicrophoneUsageDescription reads:

"SayBright uses the microphone only when you tap the record button, so you can
save an affirmation in your own voice and hear it back during your daily
practice. For example, you can record yourself saying 'I am calm and capable'
and set it to play with that affirmation each morning. Recordings are stored on
your device and are never uploaded."

For context on how the resource is used: the microphone supports one optional
feature, which lets a user record a personal affirmation in their own voice and
play it back during daily practice. Recordings are written to the app's private
documents directory, are played back only inside the app, and are never
uploaded, shared, or used for any other purpose. The permission is requested
only at the moment the user taps the record button, not at launch.

To reach the feature and the permission prompt: open the Settings tab, tap "My
Recordings" under the Subscription header, then tap the record button. This is
a SayBright Premium feature, so a sandbox subscription is needed to reach it.

The microphone is the only protected resource the app requests beyond App
Tracking Transparency.

Thank you for your time.

Ramsey Smith
