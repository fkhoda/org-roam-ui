import { Plane, Quaternion, Ray, Vector2, Vector3, type Camera } from 'three'

interface OrbitLike {
  target: Vector3
  /** off while force-graph drags a node */
  enabled: boolean
  enableRotate: boolean
  update: () => void
}

interface Options {
  camera: Camera
  controls: OrbitLike
  element: HTMLElement
  /** the nodes' current positions */
  positions: () => Vector3[]
}

const PICK_RADIUS = 60 // px: nodes this close to the cursor set the pivot's depth
const MAX_PITCH = Math.PI / 2 - 0.05 // stop short of looking straight up or down

/**
 * Rotate the 3D view around the point under the cursor instead of a fixed center. OrbitControls
 * keeps panning and zooming; rotate-drags (left button on the background) come here. The camera
 * and its target turn together around the pivot, so the view doesn't jump to the pivot.
 */
export function rotateAroundPointer({ camera, controls, element, positions }: Options) {
  controls.enableRotate = false
  let pivot: Vector3 | null = null
  let last = { x: 0, y: 0 }

  const ndc = (event: PointerEvent) => {
    const rect = element.getBoundingClientRect()
    return new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
  }

  // the point under the cursor: at the depth of the nearest node close to the cursor, else on
  // the plane through the current target facing the camera
  const pick = (event: PointerEvent) => {
    const rect = element.getBoundingClientRect()
    const cursor = ndc(event)
    let depthPoint = controls.target.clone()
    let best = Infinity
    for (const position of positions()) {
      const screen = position.clone().project(camera)
      if (screen.z > 1) continue // behind the camera
      const dx = ((screen.x - cursor.x) / 2) * rect.width
      const dy = ((screen.y - cursor.y) / 2) * rect.height
      if (Math.hypot(dx, dy) > PICK_RADIUS) continue
      const distance = position.distanceTo(camera.position)
      if (distance < best) {
        best = distance
        depthPoint = position
      }
    }
    const origin = camera.position.clone()
    const direction = new Vector3(cursor.x, cursor.y, 0.5).unproject(camera).sub(origin).normalize()
    const facing = camera.getWorldDirection(new Vector3())
    const plane = new Plane().setFromNormalAndCoplanarPoint(facing, depthPoint)
    return new Ray(origin, direction).intersectPlane(plane, new Vector3()) ?? depthPoint.clone()
  }

  const onDown = (event: PointerEvent) => {
    // node drags start on the node itself: force-graph turns the controls off for those
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return
    pivot = pick(event)
    last = { x: event.clientX, y: event.clientY }
  }

  const onMove = (event: PointerEvent) => {
    if (!pivot || !(event.buttons & 1) || !controls.enabled) return
    const speed = (2 * Math.PI) / element.clientHeight
    const yaw = -(event.clientX - last.x) * speed
    let pitch = -(event.clientY - last.y) * speed
    last = { x: event.clientX, y: event.clientY }

    // keep the camera between straight up and straight down
    const forward = camera.getWorldDirection(new Vector3())
    const elevation = Math.asin(Math.max(-1, Math.min(1, forward.y)))
    pitch = Math.max(-MAX_PITCH - elevation, Math.min(MAX_PITCH - elevation, pitch))

    const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    const rotation = new Quaternion()
      .setFromAxisAngle(new Vector3(0, 1, 0), yaw)
      .multiply(new Quaternion().setFromAxisAngle(right, pitch))
    for (const point of [camera.position, controls.target]) {
      point.sub(pivot).applyQuaternion(rotation).add(pivot)
    }
    camera.quaternion.premultiply(rotation)
    controls.update()
  }

  const onUp = () => {
    pivot = null
  }

  element.addEventListener('pointerdown', onDown)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  return () => {
    element.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    controls.enableRotate = true
  }
}
