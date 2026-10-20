// Saves this Mac's Dictionary app icon as a PNG: osascript -l JavaScript fetch-icon.js <output.png>
ObjC.import("AppKit");

function run(argv) {
  const icon = $.NSWorkspace.sharedWorkspace.iconForFile("/System/Applications/Dictionary.app");
  const reps = ObjC.unwrap($.NSBitmapImageRep.imageRepsWithData(icon.TIFFRepresentation));
  const best = reps.filter((rep) => rep.pixelsWide <= 1024).sort((a, b) => b.pixelsWide - a.pixelsWide)[0];
  if (best) best.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $({})).writeToFileAtomically(argv[0], true);
}
