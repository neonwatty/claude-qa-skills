# Screenshot Management Guide

## Directory Structure

```
workflows/
├── screenshots/
│   ├── ios-audit/
│   │   ├── wf01-step01.png
│   │   ├── wf01-step02.png
│   │   └── ...
│   ├── {workflow-name}/
│   │   ├── before/
│   │   │   ├── 01-hamburger-menu.png
│   │   │   ├── 02-fab-button.png
│   │   │   └── ...
│   │   ├── after/
│   │   │   ├── 01-tab-bar-navigation.png
│   │   │   ├── 02-no-fab.png
│   │   │   └── ...
│   │   ├── analysis/
│   │   │   ├── touch-targets-overlay.png
│   │   │   ├── navigation-pattern.png
│   │   │   └── contrast-check.png
│   │   └── mockups/
│   │       ├── tab-bar-solution.png
│   │       └── fixed-touch-targets.png
│   └── {another-workflow}/
│       ├── before/
│       ├── after/
│       ├── analysis/
│       └── mockups/
├── ios-workflows.md
└── ios-changes-report.html
```

## Naming Conventions

### Audit Screenshots
- Pattern: `wf{workflow_number:02d}-step{step_number:02d}.png`
- Example: `wf01-step03.png`
- Location: `workflows/screenshots/ios-audit/`

### Before/After Screenshots
- Pattern: `{NN}-{descriptive-name}.png`
- Examples:
  - `01-hamburger-menu.png` (before)
  - `01-tab-bar-navigation.png` (after)
  - `02-fab-button-visible.png` (before)
  - `02-fab-removed.png` (after)

## Capturing BEFORE Screenshots

1. When an issue is identified during workflow execution
2. Take screenshot BEFORE any fix is applied
3. Save to `workflows/screenshots/{workflow-name}/before/`
4. Use descriptive filename that identifies the issue
5. Record the screenshot path in the issue tracking

## Capturing AFTER Screenshots

1. Only after user approves fixing an issue
2. After fix agent completes, reload/refresh the app
3. Take screenshot showing the fix
4. Save to `workflows/screenshots/{workflow-name}/after/`
5. Use matching filename pattern to the before screenshot

### iOS Simulator

Use `screenshot({ output_path: "workflows/screenshots/ios-audit/wfNN-stepNN.png" })` from the iOS Simulator MCP. Reload the app in the simulator before capturing after screenshots.

### Chrome Mobile Viewport

Use `playwright-cli -s={session} screenshot` to capture screenshots. Save to `workflows/screenshots/{workflow}/step-{num}.png`. Capture before/after each workflow step execution.

## Screenshot Optimization

```python
from PIL import Image
import os

def optimize_screenshots(workflow_slug):
    """Compress and optimize screenshots for web delivery"""
    screenshot_dir = f"workflows/screenshots/{workflow_slug}"

    for root, dirs, files in os.walk(screenshot_dir):
        for file in files:
            if file.endswith('.png'):
                filepath = os.path.join(root, file)
                img = Image.open(filepath)

                # Resize if too large (max 1200px width)
                if img.width > 1200:
                    ratio = 1200 / img.width
                    new_size = (1200, int(img.height * ratio))
                    img = img.resize(new_size, Image.LANCZOS)

                # Save with optimization
                img.save(filepath, optimize=True, quality=85)

                # Also save WebP version for modern browsers
                webp_path = filepath.replace('.png', '.webp')
                img.save(webp_path, 'WEBP', quality=80)
```

## Annotation Generation

Create annotated screenshots highlighting issues:

```python
from PIL import Image, ImageDraw, ImageFont

def annotate_touch_target_issue(screenshot_path, elements_below_minimum):
    """Draw red boxes around touch targets below 44pt minimum"""
    img = Image.open(screenshot_path)
    draw = ImageDraw.Draw(img)

    for element in elements_below_minimum:
        x, y, width, height = element['bounds']

        # Draw red rectangle
        draw.rectangle(
            [(x, y), (x + width, y + height)],
            outline='red',
            width=3
        )

        # Add measurement label
        label = f"{element['width_pt']}x{element['height_pt']}pt"
        draw.text(
            (x, y - 20),
            label,
            fill='red',
            font=ImageFont.truetype('Arial', 16)
        )

    # Save annotated version
    output_path = screenshot_path.replace('/before/', '/analysis/')
    img.save(output_path)

    return output_path
```

## Device Frame Wrapping

Generate device frame mockups for reports:

```python
def wrap_in_device_frame(screenshot_path):
    """Wrap screenshot in iPhone device frame for realistic presentation"""
    screenshot = Image.open(screenshot_path)

    # Device frame dimensions (iPhone 14 Pro)
    frame_width = 393 + 24  # Add border
    frame_height = 852 + 48  # Add border + notch area

    # Create new image with device frame
    device_frame = Image.new('RGB', (frame_width, frame_height), color='#1a1a1a')

    # Paste screenshot into frame
    device_frame.paste(screenshot, (12, 36))

    # Draw rounded corners (simplified)
    draw = ImageDraw.Draw(device_frame)

    # Draw notch (simplified rectangle)
    notch_width = 120
    notch_height = 30
    notch_x = (frame_width - notch_width) // 2
    draw.rectangle(
        [(notch_x, 8), (notch_x + notch_width, 8 + notch_height)],
        fill='#1a1a1a'
    )

    # Save framed version
    output_path = screenshot_path.replace('.png', '-framed.png')
    device_frame.save(output_path)

    return output_path
```
