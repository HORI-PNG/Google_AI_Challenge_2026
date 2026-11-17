"""承認済みキャラクターを共通の骨格で動かし、Web用GLBへ書き出す。"""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector, Matrix, Euler

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT))
INPUT=next((Path(x.split('=',1)[1]) for x in sys.argv if x.startswith('--input=')),ROOT/'stage-character.blend')
OUTPUT=next((Path(x.split('=',1)[1]) for x in sys.argv if x.startswith('--output=')),ROOT/'export'/'mindfulness-stage-character.glb')
OUTPUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(INPUT))
from rig_character import prepare_character
rig,character,microphone,foot_refs=prepare_character()
scene=bpy.context.scene
scene.render.fps=24
FPS=24
rest={name:b.matrix_local.copy() for name,b in rig.data.bones.items()}
feet={s:rig.data.bones['foot.'+s].head_local.copy() for s in ['L','R']}
wrists={s:rig.data.bones['wrist.'+s].head_local.copy() for s in ['L','R']}
sole_z={s:min(p.z for p in foot_refs[s]) for s in ['L','R']}
for obj in [character,microphone]:
    for mod in obj.modifiers:
        if mod.type=='ARMATURE':mod.show_viewport=False
moving=['root','spine02','spine01','head','jaw']+[p+'.'+s for s in ['L','R']
        for p in ['upperarm01','upperarm02','lowerarm01','lowerarm02','wrist',
                  'upperleg01','upperleg02','lowerleg01','lowerleg02','foot']]
for pb in rig.pose.bones:pb.rotation_mode='QUATERNION'


def update():
    bpy.context.view_layer.update()


def reset():
    for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
    update()


def orientation(name,direction):
    b=rig.data.bones[name]
    q=(b.tail_local-b.head_local).rotation_difference(Vector(direction).normalized())
    return q.to_matrix()@b.matrix_local.to_3x3()


def aim(name,direction):
    pb=rig.pose.bones[name]
    m=orientation(name,direction).to_4x4();m.translation=pb.head.copy();pb.matrix=m
    update()


def turn(name,rx=0,ry=0,rz=0):
    pb=rig.pose.bones[name]
    m=(Euler((rx,ry,rz),'XYZ').to_matrix()@pb.matrix.to_3x3()).to_4x4()
    m.translation=pb.head.copy();pb.matrix=m
    update()


def root_position(offset):
    m=rest['root'].copy();m.translation+=Vector(offset);rig.pose.bones['root'].matrix=m
    update()


def root_yaw(angle,offset):
    rotation=Matrix.Rotation(angle,3,'Z')
    m=(rotation@rest['root'].to_3x3()).to_4x4()
    m.translation=rest['root'].translation+rotation@Vector(offset)
    rig.pose.bones['root'].matrix=m
    update()


def limb(side,kind,target,pole):
    names=([f'upperarm01.{side}',f'upperarm02.{side}',f'lowerarm01.{side}',f'lowerarm02.{side}']
           if kind=='arm' else [f'upperleg01.{side}',f'upperleg02.{side}',f'lowerleg01.{side}',f'lowerleg02.{side}'])
    p=rig.pose.bones[names[0]].head.copy();target=Vector(target)
    l1=sum(rig.data.bones[n].length for n in names[:2]);l2=sum(rig.data.bones[n].length for n in names[2:])
    delta=target-p;distance=max(.025,min(delta.length,l1+l2-.0005))
    direction=delta.normalized();a=(l1*l1-l2*l2+distance*distance)/(2*distance)
    height=math.sqrt(max(0,l1*l1-a*a))
    across=Vector(pole);across-=direction*across.dot(direction)
    if across.length<.0001:across=Vector((0,-1,0))
    joint=p+direction*a+across.normalized()*height
    for n in names[:2]:aim(n,joint-p)
    final_target=p+direction*distance
    for n in names[2:]:aim(n,final_target-joint)


def foot_rotation(side,pitch=0):
    name='foot.'+side;pb=rig.pose.bones[name]
    m=(Matrix.Rotation(pitch,3,'X')@rest[name].to_3x3()).to_4x4()
    m.translation=pb.head.copy();pb.matrix=m;update()


def leg(side,target,pitch=0,planted=True):
    target=Vector(target)
    for iteration in range(2 if planted else 1):
        limb(side,'leg',target,(0,-1,0))
        foot_rotation(side,pitch)
        if planted and iteration==0:
            transform=rig.pose.bones['foot.'+side].matrix@rest['foot.'+side].inverted()
            floor=min((transform@p).z for p in foot_refs[side])
            target.z+=sole_z[side]-floor


def arm(side,target,hand_direction=None):
    sign=1 if side=='L' else -1
    limb(side,'arm',target,(sign*.65,-.35,-.45))
    direction=hand_direction if hand_direction else (sign*.10,-.04,-1)
    aim('wrist.'+side,direction)


def clamp(value):return max(0,min(1,value))
def smooth(value):
    v=clamp(value);return v*v*(3-2*v)
def mix(a,b,t):return Vector(a).lerp(Vector(b),t)


def pose(kind,t,duration):
    reset()
    offset=Vector((0,0,0));yaw=0
    left=feet['L'].copy();right=feet['R'].copy()
    left_pitch=right_pitch=0;right_planted=True
    left_hand=wrists['L'].copy();right_hand=wrists['R'].copy()
    left_direction=right_direction=None
    phase=2*math.pi*t/duration
    if kind=='singing':
        offset=Vector((.018*math.sin(phase),0,-.014*(.5-.5*math.cos(phase*2))))
        root_position(offset)
        turn('spine02',ry=.022*math.sin(phase))
        turn('head',rx=.018*math.sin(phase*2))
        turn('jaw',rx=.10*(.5+.5*math.sin(phase*4)))
        right_hand=Vector((-.065,-.222,1.42))
        right_direction=(.30,-.20,.93)
        left_hand+=Vector((.025*math.sin(phase),-.04,.065+.035*math.sin(phase)))
    elif kind=='spin-kick':
        spin=smooth((t-.12)/1.35);yaw=2*math.pi*spin
        kick=math.sin(math.pi*clamp((t-1.8)/1.05)) if 1.8<=t<=2.85 else 0
        offset=Vector((.08*kick,0,-.018*math.sin(math.pi*t/duration)**2))
        root_position(offset)
        turn('spine02',ry=.05*kick)
        extend=math.sin(math.pi*clamp(t/1.75)) if t<1.75 else .25*kick
        left_hand+=Vector((.22*extend,-.06*extend,.39*extend))
        right_hand+=Vector((-.22*extend,-.06*extend,.39*extend+.04*kick))
        right+=Vector((.04*kick,-.48*kick,.43*kick))
        right_pitch=-.22*kick;right_planted=kick<.001
    elif kind=='robot':
        states=[((.42,-.10,1.28),(-.37,-.17,1.16),0),
                ((.34,-.23,1.47),(-.42,-.11,1.28),.10),
                ((.23,-.27,1.32),(-.30,-.20,1.47),-.10),
                ((.43,-.10,1.10),(-.23,-.27,1.32),-.10),
                ((.37,-.17,1.16),(-.42,-.10,1.28),0),
                ((.42,-.11,1.28),(-.34,-.23,1.47),-.10),
                ((.30,-.20,1.47),(-.23,-.27,1.32),.10),
                ((.23,-.27,1.32),(-.43,-.10,1.10),.10)]
        beat=t/duration*len(states);k=int(beat)%len(states);u=smooth(((beat%1)-.65)/.35)
        a,b=states[k],states[(k+1)%len(states)]
        left_hand=mix(a[0],b[0],u);right_hand=mix(a[1],b[1],u)
        offset=Vector((.012*math.sin(phase*2),0,-.025*(.5-.5*math.cos(phase*8))))
        root_position(offset)
        turn('head',ry=.035*math.cos(phase*4),rz=a[2]*(1-u)+b[2]*u)
        left_direction=(0,-1,0) if k%2 else (0,0,-1)
        right_direction=(0,0,-1) if k%2 else (0,-1,0)
    else:
        yaw=-math.pi/2
        cycle=phase*2;stride=.13*math.cos(cycle)
        offset=Vector((.012*math.sin(cycle),.08*math.sin(phase),-.018*(.5-.5*math.cos(cycle*2))))
        root_position(offset)
        turn('spine02',rx=.025)
        turn('head',rx=-.012)
        left.x*=.42;right.x*=.42
        left.y-=stride;right.y+=stride
        left_pitch=.48*max(0,-math.sin(cycle));right_pitch=.48*max(0,math.sin(cycle))
        left_hand+=Vector((-.025,-.02,.055+.045*math.sin(cycle)))
        right_hand+=Vector((.025,.01,.055-.045*math.sin(cycle)))
    for target in [left,right]:target.x+=offset.x;target.y+=offset.y
    leg('L',left,left_pitch)
    leg('R',right,right_pitch,right_planted)
    arm('L',left_hand+Vector((offset.x,offset.y,0)),left_direction)
    arm('R',right_hand+Vector((offset.x,offset.y,0)),right_direction)
    root_yaw(yaw,offset)


clips={}
rig.animation_data_create()
for name,frames in [('singing',72),('spin-kick',84),('robot',96),('moonwalk',96)]:
    action=bpy.data.actions.new(name)
    action.use_fake_user=True
    rig.animation_data.action=action
    for frame in range(0,frames+1,2):
        scene.frame_set(frame)
        pose(name,frame/FPS,frames/FPS)
        for bone in moving:
            pb=rig.pose.bones[bone]
            pb.keyframe_insert('rotation_quaternion',frame=frame,group=bone)
        rig.pose.bones['root'].keyframe_insert('location',frame=frame,group='root')
    for curve in action.fcurves:
        for key in curve.keyframe_points:key.interpolation='LINEAR'
    clips[name]=action
    print('CLIP_READY',name,frames/FPS,flush=True)

rig.animation_data.action=None
reset()
for obj in [character,microphone]:
    for mod in obj.modifiers:
        if mod.type=='ARMATURE':mod.show_viewport=True
scene.frame_start=0;scene.frame_end=96;scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'stage-character-animated.blend'))

# すべての動きとマイクを1つのファイルに含め、同じキャラクターを共有する。
bpy.ops.object.select_all(action='DESELECT')
for obj in [rig,character,microphone]:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUTPUT),export_format='GLB',use_selection=True,
    export_yup=True,export_animations=True,export_animation_mode='ACTIONS',
    export_skins=True,export_all_influences=False,export_influence_nb=4,
    export_anim_single_armature=True,export_optimize_animation_size=True,
    export_morph=False,export_extras=True)
print('GLB_READY',str(OUTPUT),OUTPUT.stat().st_size,flush=True)

# WebGLのない端末にも、同じモデルの透過静止画を用意する。
rig.animation_data.action=None;reset();microphone.hide_render=True
for name in ['円形ステージ','スタジオ床']:
    if bpy.data.objects.get(name):bpy.data.objects[name].hide_render=True
camera=scene.camera
camera.location=(0,-4.5,1.05)
camera.rotation_euler=(Vector((0,0,.91))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.ortho_scale=2.12
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False
scene.cycles.use_adaptive_sampling=True;scene.cycles.adaptive_threshold=.06
scene.render.resolution_x=512;scene.render.resolution_y=880
scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=True
scene.render.filepath=str(OUTPUT.parent/'mindfulness-stage-idle.png')
bpy.ops.render.render(write_still=True)
print('FALLBACK_READY',flush=True)

if '--render-stills' in sys.argv:
    scene.render.resolution_x=360;scene.render.resolution_y=480
    scene.cycles.samples=12;scene.render.film_transparent=False
    for name in ['円形ステージ','スタジオ床']:
        if bpy.data.objects.get(name):bpy.data.objects[name].hide_render=False
    camera.data.ortho_scale=2.2
    out=ROOT/'motion-review';out.mkdir(exist_ok=True)
    for name,frames in [('robot',[8,42]),('singing',[18,42]),('spin-kick',[17,55]),('moonwalk',[12,36])]:
        rig.animation_data.action=clips[name]
        microphone.hide_render=name!='singing'
        for frame in frames:
            scene.frame_set(frame);update()
            scene.render.filepath=str(out/f'{name}-{frame}.png')
            bpy.ops.render.render(write_still=True)
            print('REVIEW_READY',name,frame,flush=True)
print('ANIMATION_COMPLETE',flush=True)
