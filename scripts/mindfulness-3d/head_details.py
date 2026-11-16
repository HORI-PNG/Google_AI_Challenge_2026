"""Small, dependency-free Blender builder for the dancer's hair and glasses.

All geometry is in metres: X is left/right, -Y is the face, and Z is up.
No add-on or external asset is needed.  Returned objects can all be parented
to the same head bone after the character's armature has been constructed.
"""

import bpy
import math
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def build_head_details(head_center=(0, -.047, 1.70), top_z=1.786,
                       front_y=-.13, *, head_width=.145, eye_z=None,
                       hair_length=.075, nape_extension=.24, collection=None):
    """Return real 3D shoulder-length curls and fine metal aviator glasses.

    ``head_width`` adjusts the horizontal scale, ``top_z`` the skull height,
    and ``hair_length`` the hanging locks. ``nape_extension`` lengthens only
    the rear locks, blending smoothly toward the sides. ``front_y`` is the skin surface
    at the eyes; the lenses are placed a few millimetres in front of it.
    The default proportions match the MakeHuman head used in this project.
    """
    cx, cy, cz = head_center
    sx = head_width / .145
    sz = max(.55, (top_z - cz) / .086)
    if eye_z is None:
        eye_z = cz + .001 * sz
    if collection is None:
        collection = bpy.data.collections.new("MJ_HeadDetails")
        bpy.context.scene.collection.children.link(collection)
    objects = []

    def material(name, color, roughness=.4, metallic=0., transmission=0.):
        mat = bpy.data.materials.get(name)
        if mat is None:
            mat = bpy.data.materials.new(name)
            mat.use_nodes = True
        shader = mat.node_tree.nodes.get("Principled BSDF")
        shader.inputs['Base Color'].default_value = (*color, 1.)
        shader.inputs['Roughness'].default_value = roughness
        shader.inputs['Metallic'].default_value = metallic
        if 'Transmission Weight' in shader.inputs:
            shader.inputs['Transmission Weight'].default_value = transmission
        if 'IOR' in shader.inputs:
            shader.inputs['IOR'].default_value = 1.46
        if 'Coat Weight' in shader.inputs:
            shader.inputs['Coat Weight'].default_value = .16 if not metallic else .04
        if 'Coat Roughness' in shader.inputs:
            shader.inputs['Coat Roughness'].default_value = .28
        mat.diffuse_color = (*color, 1.)
        return mat

    hair_mat = material('MJ_Hair_DeepBlack', (.005, .006, .008), .74)
    curl_mat = material('MJ_Hair_CurlBlack', (.008, .010, .013), .51)
    fine_mat = material('MJ_Hair_FineHighlights', (.013, .016, .021), .55)
    gold_mat = material('MJ_Glasses_BrushedGold', (.43, .285, .105), .23, .88)
    lens_mat = material('MJ_Glasses_SmokeLenses', (.010, .016, .022), .13,
                        .08, .13)
    tip_mat = material('MJ_Glasses_EarTips', (.012, .014, .018), .32)
    nose_mat = material('MJ_Glasses_NosePads', (.12, .10, .075), .35,
                        .05, .35)

    def add_object(name, data, mat):
        obj = bpy.data.objects.new(name, data)
        collection.objects.link(obj)
        if mat is not None:
            data.materials.append(mat)
        obj['renote_part'] = 'head_details'
        objects.append(obj)
        return obj

    def mesh_object(name, vertices, faces, mat):
        mesh = bpy.data.meshes.new(name + '_Geometry')
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        for face in mesh.polygons:
            face.use_smooth = True
        return add_object(name, mesh, mat)

    def curve_object(name, paths, radius, mat, bevel=3):
        curve = bpy.data.curves.new(name + '_Geometry', 'CURVE')
        curve.dimensions = '3D'
        curve.resolution_u = 2
        curve.bevel_depth = radius
        curve.bevel_resolution = bevel
        curve.resolution_u = 4
        curve.use_fill_caps = True
        for entry in paths:
            # An optional third field contains per-point radius multipliers.
            pts, cyclic = entry[:2]
            widths = entry[2] if len(entry) > 2 else None
            spline = curve.splines.new('POLY')
            spline.points.add(len(pts) - 1)
            for i, (p, co) in enumerate(zip(spline.points, pts)):
                p.co = (*co, 1.)
                p.radius = widths[i] if widths else 1.
            spline.use_cyclic_u = cyclic
        return add_object(name, curve, mat)

    def unit(v):
        d = math.sqrt(sum(a*a for a in v)) or 1.
        return tuple(a/d for a in v)

    def add(a, b):
        return tuple(x+y for x, y in zip(a, b))

    def mul(a, s):
        return tuple(x*s for x in a)

    def noise(i, j=0):
        # Stable, reproducible variation without a random-module dependency.
        a = math.sin(i*12.9898 + j*78.233) * 43758.5453
        return a - math.floor(a)

    # A close-fitting scalp under the strands prevents translucent gaps.
    # The forehead is open; the cap goes lower only at the temples and nape.
    rx, ry = .0785*sx, .094*sx
    rz, cap_cz = .100*sz, cz + .004*sz

    def boundary(phi):
        front = max(0., -math.sin(phi))
        back = max(0., math.sin(phi))
        return 1.83 - .64*front**1.55 + .25*back

    def surface(theta, phi, offset=0.):
        st, ct = math.sin(theta), math.cos(theta)
        cp, sp = math.cos(phi), math.sin(phi)
        normal = unit((st*cp/rx, st*sp/ry, ct/rz))
        ripple = .00055*sx*(math.sin(phi*17+theta*19) +
                              .45*math.sin(phi*31-theta*27))
        return ((cx + rx*st*cp + normal[0]*(offset+ripple)),
                (cy + ry*st*sp*(1.18 if sp>0 else 1.) + normal[1]*(offset+ripple)),
                (cap_cz + rz*ct + normal[2]*(offset+ripple)))

    nphi, ntheta = 80, 24
    verts = [(cx, cy, cap_cz+rz)]
    for ring in range(1, ntheta+1):
        for j in range(nphi):
            phi = 2*math.pi*j/nphi
            theta = boundary(phi)*ring/ntheta
            # Slightly irregular edge hidden by the falling curl strands.
            theta += .014*math.sin(phi*19)*((ring/ntheta)**8)
            verts.append(surface(theta, phi))
    faces = [(0, 1+j, 1+(j+1)%nphi) for j in range(nphi)]
    for ring in range(ntheta-1):
        a, b = 1+ring*nphi, 1+(ring+1)*nphi
        for j in range(nphi):
            k = (j+1)%nphi
            faces.append((a+j, b+j, b+k, a+k))
    cap = mesh_object('MJ_Hair_CloseScalp', verts, faces, hair_mat)
    solid = cap.modifiers.new('Thin scalp edge', 'SOLIDIFY')
    solid.thickness = .0012*sx
    solid.offset = -1.

    # Hundreds of narrow curls trace the surface instead of floating as
    # separate balls. Their long direction runs from crown to the hairline.
    curls, fibres = [], []
    golden_angle = math.pi*(3.-math.sqrt(5.))
    for i in range(820):
        phi = i*golden_angle
        theta = math.acos(1.-(i+.6)/821 * 1.15)
        theta = min(theta, boundary(phi)-.035)
        # Redistribute the final rows to cover the low rear of the cap.
        if i > 595:
            phi = (i-595)*golden_angle
            theta = boundary(phi)*(.65+.32*noise(i, 2))
        c = surface(theta, phi, .0011*sx)
        dt = unit((rx*math.cos(theta)*math.cos(phi),
                   ry*math.cos(theta)*math.sin(phi), -rz*math.sin(theta)))
        dp = unit((-rx*math.sin(phi), ry*math.cos(phi), 0.))
        normal = unit((math.sin(theta)*math.cos(phi)/rx,
                       math.sin(theta)*math.sin(phi)/ry, math.cos(theta)/rz))
        length = (.014+.015*noise(i, 1))*sx
        width = (.0021+.0018*noise(i, 4))*sx
        phase = noise(i, 8)*math.tau
        turns = 1.15+.85*noise(i, 5)
        path, fine, radii = [], [], []
        for j in range(26):
            t = j/25
            a = phase + math.tau*turns*t
            p = add(c, add(mul(dt, length*(t-.5)),
                          add(mul(dp, width*math.sin(a)),
                              mul(normal, .0003*sx+width*.55*(1+math.cos(a))))))
            path.append(p)
            fine.append(add(p, mul(dp, .00065*sx)))
            radii.append(.45+.55*math.sin(math.pi*t)**.35)
        curls.append((path, False, radii))
        if i % 2 == 0:
            fibres.append((fine, False, radii))
    curve_object('MJ_Hair_SurfaceRinglets', curls, .00130*sx, curl_mat)
    curve_object('MJ_Hair_SurfaceFibres', fibres, .00030*sx, fine_mat, 2)

    # 肩を越える束が服へ埋まらないよう、完成した衣装の後面を参照する。
    collision_vertices, collision_faces = [], []
    depsgraph = bpy.context.evaluated_depsgraph_get()
    garment_prefixes = ('仕立てたジャケットの胴', '黒いジャケットとパンツ',
                        '背中の金帯', '背中のベルトの金属', '黒の肩章', '肩章の金線')
    for obj in list(bpy.context.scene.objects):
        if obj.type != 'MESH' or not obj.name.startswith(garment_prefixes):
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        offset = len(collision_vertices)
        collision_vertices.extend(evaluated.matrix_world @ v.co for v in mesh.vertices)
        collision_faces.extend(tuple(offset+i for i in face.vertices) for face in mesh.polygons)
        evaluated.to_mesh_clear()
    garment_bvh = (BVHTree.FromPolygons(collision_vertices, collision_faces)
                   if collision_faces else None)

    # 後頭部のカールを肩の下まで流し、耳の横へ自然につなぐ。
    hanging, fine_hanging = [], []
    strand_count = 132
    for i in range(strand_count):
        phi = -.12 + (math.pi+.24)*(i+.5)/strand_count
        ph = phi + (noise(i, 31)-.5)*.055
        rear_weight = max(0., math.sin(ph))**.75
        length = (hair_length+nape_extension*rear_weight)*(.76+.25*noise(i, 13))*sz
        zroot = cz-(.002+.019*math.sin(ph))*sz
        radial = (.092+.004*noise(i, 16))*sx
        curl_radius = (.0021+.0018*noise(i, 12))*sx
        paths, thin, widths = [], [], []
        phase = noise(i, 41)*math.tau
        for j in range(97):
            t = j/96
            a = phase + math.tau*(2.0+.8*noise(i, 14))*(1.+1.2*rear_weight)*t
            r = radial*(1.-.12*t)
            wave = curl_radius*(.75+.25*math.sin(math.pi*t))
            x = cx+r*.86*math.cos(ph)+wave*math.sin(a)
            y = cy+r*1.18*math.sin(ph)+wave*.7*math.cos(a)
            z = zroot-length*t+.0014*sz*math.cos(a)
            if garment_bvh is not None and z < cz-.15 and rear_weight > .1:
                # 襟の端をまたぐ線分も、衣装の外へ逃がす。
                # 周囲4mmを含めた後面で、点の間の埋まりも防ぐ。
                for dx in (-.004, 0., .004):
                    for dz in (-.004, 0., .004):
                        hit, normal, index, distance = garment_bvh.ray_cast(
                            Vector((x+dx, 1., z+dz)), Vector((0., -1., 0.)))
                        if hit is not None:
                            y = max(y, hit.y+.015)
            p = (x, y, z)
            paths.append(p)
            thin.append((p[0]+.0007*sx*math.cos(ph),
                         p[1]+.0007*sx*math.sin(ph), p[2]))
            widths.append((1.-.72*t**4)*(.65+.35*math.sin(math.pi*t)**.3))
        hanging.append((paths, False, widths))
        if i % 2 == 0:
            fine_hanging.append((thin, False, widths))
    curve_object('MJ_Hair_MediumNapeCurls', hanging, .00175*sx, curl_mat)
    curve_object('MJ_Hair_NapeFineStrands', fine_hanging, .00036*sx, fine_mat, 2)

    # A few characteristic wet curls fall onto the forehead, not a fringe.
    fringe = []
    for i, (xoff, fall, width) in enumerate(((.016, .041, .0038),
                                            (.029, .034, .0030),
                                            (-.039, .030, .0027))):
        pts, widths = [], []
        for j in range(36):
            t = j/35
            a = 1.3+i+math.tau*(1.12+.17*i)*t
            pts.append((cx+(xoff+width*math.sin(a))*sx,
                        front_y+(.010-.015*t+.0018*math.cos(a))*sx,
                        cz+(.047-fall*t)*sz))
            widths.append(.85*(1.-.70*t**5))
        fringe.append((pts, False, widths))
    curve_object('MJ_Hair_ForeheadCurls', fringe, .00135*sx, curl_mat)

    side_locks=[]
    for side in [-1,1]:
        for i in range(7):
            path=[];widths=[]
            for j in range(46):
                t=j/45
                wave=.003*math.sin(t*math.tau*2.1+i)
                path.append((cx+side*(.062+.010*t+wave+.0012*i)*sx,
                             front_y+.018+.012*t+.0015*i,
                             cz+.035-(.105+.003*i)*t))
                widths.append(.85*(1-.85*t**5))
            side_locks.append((path,False,widths))
    curve_object('MJ_Hair_TempleLongCurls',side_locks,.00145*sx,curl_mat)

    # Catmull-Rom samples keep the aviator rims slender and smoothly rounded.
    def closed_smooth(points, steps=7):
        out = []
        count = len(points)
        for i in range(count):
            p0, p1, p2, p3 = (points[(i+k)%count] for k in (-1, 0, 1, 2))
            for j in range(steps):
                t = j/steps
                out.append(tuple(.5*((2*p1[a])+(-p0[a]+p2[a])*t+
                                (2*p0[a]-5*p1[a]+4*p2[a]-p3[a])*t*t+
                                (-p0[a]+3*p1[a]-3*p2[a]+p3[a])*t*t*t)
                                 for a in range(len(p1))))
        return out

    contour = closed_smooth([(-.022,.011), (-.010,.0165),
                             (.018,.0155), (.028,.006),
                             (.023,-.012), (.007,-.022),
                             (-.013,-.018), (-.024,-.003)])
    lens_cx, lens_plane = .032*sx, front_y-.008*sx

    def lenspoint(side, lx, lz, front_offset=0.):
        x = side*(lens_cx+lx*sx)
        wrap = .010*sx*(abs(x)/(.064*sx))**1.8
        return (cx+x, lens_plane+wrap+front_offset, eye_z+lz*sz)

    rims, temples, tips, pads = [], [], [], []
    for side, label in ((-1, 'L'), (1, 'R')):
        ring = [lenspoint(side, x, z) for x, z in contour]
        # A shallow convex lens, with genuine solid thickness and refraction.
        center = lenspoint(side, .001, -.002, -.0008*sx)
        lens_vertices = [center] + ring
        lens_faces = []
        for i in range(len(ring)):
            a, b = i+1, (i+1)%len(ring)+1
            lens_faces.append((0, b, a) if side == 1 else (0, a, b))
        lens = mesh_object('MJ_Aviator_Lens_'+label, lens_vertices,
                           lens_faces, lens_mat)
        solid = lens.modifiers.new('Thin optical glass', 'SOLIDIFY')
        solid.thickness = .00065*sx
        solid.offset = 0.
        rims.append(([lenspoint(side, x,z,-.0002*sx) for x,z in contour], True))
        # Swept back along the temple, then downward behind the ear.
        temple_points = [lenspoint(side, .027,.009),
                         (cx+side*.069*sx, front_y+.013*sx, eye_z+.009*sz),
                         (cx+side*.075*sx, cy-.009*sx, eye_z+.006*sz),
                         (cx+side*.075*sx, cy+.027*sx, eye_z+.002*sz)]
        # A smooth, physically slender arm rather than a flat painted line.
        arm = []
        for a, b in zip(temple_points[:-1], temple_points[1:]):
            for j in range(8):
                t=j/8
                arm.append(tuple(a[k]*(1-t)+b[k]*t for k in range(3)))
        arm.append(temple_points[-1])
        temples.append((arm, False))
        hook=[]
        for j in range(18):
            t=j/17
            hook.append((cx+side*(.075-.003*t)*sx,
                         cy+(.027+.010*math.sin(t*math.pi*.8))*sx,
                         eye_z+(.002-.028*t)*sz))
        tips.append((hook,False))
        pads.append(([(cx+side*.009*sx, lens_plane+.007*sx, eye_z-.001*sz),
                      (cx+side*.008*sx, lens_plane+.010*sx, eye_z-.009*sz)],False))
    curve_object('MJ_Aviator_GoldRims', rims, .00067*sx, gold_mat, 4)
    curve_object('MJ_Aviator_TempleArms', temples, .00078*sx, gold_mat, 4)
    curve_object('MJ_Aviator_EarTips', tips, .00115*sx, tip_mat, 3)
    curve_object('MJ_Aviator_NosePads', pads, .0016*sx, nose_mat, 3)
    bridges=[]
    bridge=[]
    brow=[]
    for j in range(25):
        t=j/24
        x=(-.010+.020*t)*sx
        bridge.append((cx+x, lens_plane-.0005*sx,
                       eye_z+(.006+.004*math.sin(math.pi*t))*sz))
        x=(-.020+.040*t)*sx
        brow.append((cx+x, lens_plane+.001*sx,
                     eye_z+(.015+.0023*math.sin(math.pi*t))*sz))
    bridges.extend(((bridge,False),(brow,False)))
    curve_object('MJ_Aviator_DoubleBridge', bridges, .00065*sx, gold_mat, 4)
    return objects
