/**
*PhySprite.enchant.js
* @version 1.40
* @require enchant.js v0.4.3 or later
* @require Box2dWeb.js
* @author kassy708 http://twitter.com/kassy708
*
* @description
* 物理演算用のSprite
* このプラグインではBox2dWeb.jsを用いています。
* 最新のBox2dWeb.jsは下記アドレスからダウンロードしてください。
* http://www.gphysics.com/
*
* @license
* The MIT License
* Copyright (c) 2012/01/26 kassy708
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*/

/**
* 長さの単位,pxとmの大きさの比率
*/
var WORLD_SCALE = 32;
/**
* 物理ワールド
*/
var world = null;


var b2Vec2 = Box2D.Common.Math.b2Vec2
, b2AABB = Box2D.Collision.b2AABB
, b2BodyDef = Box2D.Dynamics.b2BodyDef
, b2Body = Box2D.Dynamics.b2Body
, b2FixtureDef = Box2D.Dynamics.b2FixtureDef
, b2Fixture = Box2D.Dynamics.b2Fixture
, b2World = Box2D.Dynamics.b2World
, b2MassData = Box2D.Collision.Shapes.b2MassData
, b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
, b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
, b2DebugDraw = Box2D.Dynamics.b2DebugDraw
, b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef
;


/**
* Spriteの種類（スタティック）
* @type {Number}
*/
var STATIC_SPRITE = b2Body.b2_staticBody;
/**
* Spriteの種類（ダイナミック）
* @type {Number}
*/
var DYNAMIC_SPRITE = b2Body.b2_dynamicBody;
/**
* Spriteの種類（キネマティック）
* @type {Number}
*/
var KINEMATIC_SPRITE = b2Body.b2_kinematicBody;

/**
* @scope enchant.PhysicsWorld.prototype
*/
enchant.PhysicsWorld = enchant.Class.create({
    /**
    * 物理シミュレーションを行う世界のクラス
    * @example
    *   //y軸方向へ重力加速度9.8m/s^2
    *   var physicsWorld = new PhysicsWorld(0, 9.8);
    *   //無重力
    *   var physicsWorld = new PhysicsWorld(0, 0);
    * 
    * @param {Number} [gravityX] x軸方向への引力.
    * @param {Number} [gravityY] y軸方向への引力.
    * @constructs
    */
    initialize: function (gravityX, gravityY) {
        /**
        * 物理シミュレーションの精度
        * @type {Nunber}
        */
        this.iterations = 10;
        world = new b2World(
            new b2Vec2(gravityX, gravityY)  //gravity
            , true                          //allow sleep
        );
    },
    /**
    * 物理シミュレーション内の時間を進める
    * @param {b2Vec2} [pos] Spriteの座標.
    */
    step: function (fps) {
        world.Step(1 / fps, this.iterations, this.iterations);
    },
    /**
    * 物体の当たり判定
    * @example
    *   //ぶつかった2つのSpriteを消す
    *   physicsWorld.contact(function (sprite1, sprite2) {
    *       sprite1.destroy();
    *       sprite2.destroy(); 
    *   });
    *
    * @param {function(sprite1:enchant.PhySprite,sprite2:enchant.PhySprite)} [func] 当たり判定時の処理
    */
    contact: function (func) {
        var c = world.m_contactList;
        if (c) {
            for (var contact = c; contact; contact = contact.m_next) {
                var pos1 = contact.m_fixtureA.m_body.GetPosition().Copy();
                pos1.Subtract(contact.m_fixtureB.m_body.GetPosition());
                pos1.Multiply(WORLD_SCALE);
                var r1 = (contact.m_fixtureA.m_body.m_userData.width + contact.m_fixtureB.m_body.m_userData.width) / 2;
                var r2 = (contact.m_fixtureA.m_body.m_userData.height + contact.m_fixtureB.m_body.m_userData.height) / 2;
                if (Math.abs(pos1.x) <= r1 && Math.abs(pos1.y) <= r2) {
                    func(contact.m_fixtureA.m_body.m_userData, contact.m_fixtureB.m_body.m_userData);
                }
            }
        }
    },
    /**
    * ワールドにあるすべてのオブジェクトを削除
    * シーンの切り替わり時に呼んでおかないと、次のシーンでも衝突判定がおこってしまう。
    */
    cleanAllSprite: function () {
        var body = world.m_bodyList;
        var nextBody;
        while (body) {
            nextBody = body.m_next;
            if (body.m_userData) {
                body.m_userData.destroy();
            }
            else {
                world.DestroyBody(body);
            }
            body = nextBody;
        }
    }
});


/**
* @scope enchant.PhySprite.prototype
*/
enchant.PhySprite = enchant.Class.create(enchant.Sprite, {
    /**
    * 画像表示機能を持った物理シミュレーションクラス.
    * @param {Number} [width] Spriteの横幅.
    * @param {Number} [height] Spriteの高さ.
    * @constructs
    * @extends enchant.Sprite
    */
    initialize: function (width, height) {
        this.body;
        enchant.Sprite.call(this, width, height);

        var time = 0;
        this.addEventListener(enchant.Event.ENTER_FRAME, function (e) {
            this.x = this.x;
            this.y = this.y;
            if (time % 2) {   //なぜか移動と回転を一緒にできない。謎。
                this.rotation = this.angle;
            }
            time = (time + 1) % 2;
        });
    },
    /**
    * 四角形の物理シミュレーション用Sprite生成.
    * @param {Boolean} type 静的,動的,キネマティック
    * @param {Number} density Spriteの密度.
    * @param {Number} friction Spriteの摩擦.
    * @param {Number} restitution Spriteの反発.
    * @param {Boolean} isSleeping Spriteが初めから物理演算を行うか.
    */
    createPhyBox: function (type, density, friction, restitution, awake) {
        var fixDef = new b2FixtureDef;
        fixDef.density = (density != null ? density : 1.0);             // 密度
        fixDef.friction = (friction != null ? friction : 0.5);          // 摩擦
        fixDef.restitution = (restitution != null ? restitution : 0.3); // 反発
        fixDef.shape = new b2PolygonShape;
        fixDef.shape.SetAsBox(this.width / 2 / WORLD_SCALE, this.height / 2 / WORLD_SCALE);
        var bodyDef = new b2BodyDef;
        bodyDef.type = type;
        bodyDef.position.x = 0;
        bodyDef.position.y = 0;
        bodyDef.awake = (awake != null ? awake : true);
        bodyDef.userData = this;
        return world.CreateBody(bodyDef).CreateFixture(fixDef);
    },
    /**
    * 円形の物理シミュレーション用Sprite生成.
    * @param {Boolean} type 静的,動的,キネマティック
    * @param {Number} density Spriteの密度.
    * @param {Number} friction Spriteの摩擦.
    * @param {Number} restitution Spriteの反発.
    * @param {Boolean} isSleeping Spriteが初めから物理演算を行うか.
    */
    createPhyCircle: function (type, density, friction, restitution, awake) {
        var fixDef = new b2FixtureDef;
        fixDef.density = (density != null ? density : 1.0);             // 密度
        fixDef.friction = (friction != null ? friction : 0.5);          // 摩擦
        fixDef.restitution = (restitution != null ? restitution : 0.3); // 反発
        fixDef.shape = new b2CircleShape(this.width / 2 / WORLD_SCALE);
        var bodyDef = new b2BodyDef;
        bodyDef.type = type;
        bodyDef.position.x = 0;
        bodyDef.position.y = 0;
        bodyDef.awake = (awake != null ? awake : true);
        bodyDef.userData = this;
        return world.CreateBody(bodyDef).CreateFixture(fixDef);
    },
    /**
    * Spriteのタイプ 静的（STATIC_SPRITE）か動的（DYNAMIC_SPRITE)かキネマティック(KINEMATIC_SPRITE)か
    * @type {bool}
    */
    type: {
        get: function () {
            return this.body.m_body.GetType();
        },
        set: function (type) {
            this.body.m_body.SetType(type);
        }
    },
    /**
    * Spriteのx座標.
    * @type {Number}
    */
    x: {
        get: function () {
            return this.body.m_body.GetPosition().x * WORLD_SCALE - this.width / 2;
        },
        set: function (x) {
            this._x = x;
            x += this.width / 2;
            this.body.m_body.SetPosition(new b2Vec2(x / WORLD_SCALE, this.body.m_body.GetPosition().y));
            this._updateCoordinate();
        }
    },
    /**
    * Spriteのy座標.
    * @type {Number}
    */
    y: {
        get: function () {
            return this.body.m_body.GetPosition().y * WORLD_SCALE - this.height / 2;
        },
        set: function (y) {
            this._y = y;
            y += this.height / 2;
            this.body.m_body.SetPosition(new b2Vec2(this.body.m_body.GetPosition().x, y / WORLD_SCALE));
            this._updateCoordinate();
        }
    },
    /**
    * Spriteの中心のx座標.
    * @type {Number}
    */
    centerX: {
        get: function () {
            return this.x + this.width / 2;
        },
        set: function (x) {
            this.x = x - this.width / 2;
        }
    },
    /**
    * Spriteの中心のy座標.
    * @type {Number}
    */
    centerY: {
        get: function () {
            return this.y + this.height / 2;
        },
        set: function (y) {
            this.y = y - this.height / 2;
        }
    },
    /**
    * Spriteの中心座標ベクトル.
    * @type {b2Vec2}
    */
    position: {
        get: function () {
            var pos = this.body.m_body.GetPosition().Copy();
            pos.Multiply(WORLD_SCALE);
            return pos;
        },
        set: function (pos) {
            this.centerX = pos.x;
            this.centerY = pos.y;
            this.body.m_body.SetPosition(new b2Vec2(pos.x / WORLD_SCALE, pos.y / WORLD_SCALE));
        }
    },
    /**
    * Spriteのx座標の速度（単位はpx/s）.
    * @type {Number}
    */
    vx: {
        get: function () {
            return this.body.m_body.GetLinearVelocity().x * WORLD_SCALE;
        },
        set: function (x) {
            this.body.m_body.SetLinearVelocity(new b2Vec2(x / WORLD_SCALE, this.body.m_body.GetLinearVelocity().y));
        }
    },
    /**
    * Spriteのy座標の速度（単位はpx/s）.
    * @type {Number}
    */
    vy: {
        get: function () {
            return this.body.m_body.GetLinearVelocity().y * WORLD_SCALE;
        },
        set: function (y) {
            this.body.m_body.SetLinearVelocity(new b2Vec2(this.body.m_body.GetLinearVelocity().x, y / WORLD_SCALE));
        }
    },
    /**
    * Spriteの速度（単位はpx/s）.
    * @type {b2Vec2}
    */
    velocity: {
        get: function () {
            var v = this.body.m_body.GetLinearVelocity().Copy();
            v.Multiply(WORLD_SCALE);
            return v;
        },
        set: function (v) {
            this.body.m_body.SetLinearVelocity(new b2Vec2(v.x / WORLD_SCALE, v.y / WORLD_SCALE));
        }
    },
    /**
    * Spriteの角度 (度数法)..
    * @type {Number}
    */
    angle: {
        get: function () {
            return this.body.m_body.GetAngle() * (180 / Math.PI);
        },
        set: function (angle) {
            this.rotation = angle;
            this.body.m_body.SetAngle(angle * (Math.PI / 180));
        }
    },
    /**
    * Spriteの角速度（単位はdeg/s）.
    * @type {b2Vec2}
    */
    angularVelocity: {
        get: function () {
            return this.body.m_body.GetAngularVelocity() * (180 / Math.PI);
        },
        set: function (omega) {
            this.setAwake(true);
            this.body.m_body.SetAngularVelocity(omega * (Math.PI / 180));
        }
    },
    /**
    * 継続的な力を加える
    * @param {b2Vec2} force 加える力のベクトル
    */
    applyForce: function (force) {
        this.setAwake(true);
        this.body.m_body.ApplyForce(force, this.body.m_body.GetPosition());
    },
    /**
    * 瞬間的な力を加える
    * @param {b2Vec2} impulse 加える力のベクトル
    */
    applyImpulse: function (impulse) {
        this.setAwake(true);
        this.body.m_body.ApplyImpulse(impulse, this.body.m_body.GetPosition());
    },
    /**
    * 継続的な回転力を与える
    * @param {Number} torque 加える回転力
    */
    applyTorque: function (torque) {
        this.setAwake(true);
        this.body.m_body.ApplyTorque(torque);
    },
    /**
    * 物理シミュレーションされているか
    * 物体の動きが止まると処理コスト軽減のためsleep状態になる
    * @type {Boolean}
    */
    sleep: {
        get: function () {
            return this.body.m_body.IsSleepingAllowed();
        },
        set: function (flag) {
            this.setAwake(true);
            this.body.m_body.SetSleepingAllowed(flag);
        }
    },
    /**
    * 物理シミュレーションされていない時、物理シミュレーションを行う(sleep時は動かなくなるので)
    * @param {Boolean} flag 物理シミュレーションを行うかどうか
    */
    setAwake: function (flag) {
        this.body.m_body.SetAwake(flag);
    },
    /**
    * アクティブかどうか
    * 物理シミュレーションが行われて、他の物体に干渉できるか
    * @type {Boolean}
    */
    active: {
        get: function () {
            return this.body.m_body.IsActive();
        },
        set: function (flag) {
            this.body.m_body.SetActive(flag);
        }
    },
    /**
    * 表示/非表示(物理シミュレーションも止まる)
    * @type {Boolean}
    */
    visible: {
        get: function () {
            return this.active;
        },
        set: function (visible) {
            if (this._visible = visible) {
                this._style.display = 'block';
            } else {
                this._style.display = 'none';
            }
            this.active = visible;
        }
    },
    /**
    * 静的オブジェクトかどうか
    * @return {Boolean}
    */
    isStatic: function () {
        return (this.type == STATIC_SPRITE);
    },
    /**
    * 動的オブジェクトかどうか
    * @return {Boolean}
    */
    isDynamic: function () {
        return (this.type == DYNAMIC_SPRITE);
    },
    /**
    * 衝突判定
    * @example
    *   //bearに当たったSpriteを消す
    *   bear.contact(function (sprite) {
    *      sprite.destroy(); 
    *   });
    * 
    * @param {function(sprite:enchant.PhySprite)} [func] ぶつかったSpriteを引数とする関数
    */
    contact: function (func) {
        var c = this.body.m_body.m_contactList;
        if (c) {
            for (var contact = c.contact; contact; contact = contact.m_next) {
                var pos1 = contact.m_fixtureA.m_body.GetPosition().Copy();
                pos1.Subtract(contact.m_fixtureB.m_body.GetPosition());
                pos1.Multiply(WORLD_SCALE);
                var r1 = (contact.m_fixtureA.m_body.m_userData.width + contact.m_fixtureB.m_body.m_userData.width) / 1.5;
                var r2 = (contact.m_fixtureA.m_body.m_userData.height + contact.m_fixtureB.m_body.m_userData.height) / 1.5;
                if (Math.abs(pos1.x) <= r1 && Math.abs(pos1.y) <= r2) {
                    //片方が自分ならもう片方をぶつかった相手として処理する
                    if (this.body.m_body == contact.m_fixtureA.m_body)
                        func(contact.m_fixtureB.m_body.m_userData);
                    else if (this.body.m_body == contact.m_fixtureB.m_body)
                        func(contact.m_fixtureA.m_body.m_userData);
                }
            }
        }
    },
    /**
    * 物体の削除
    * removeChildではなくこちらでSpriteを取り除く
    */
    destroy: function () {
        if (this.scene != null) {
            world.DestroyBody(this.body.m_body);
            this.body.Destroy();
            this.scene.removeChild(this);
        }
    },
    /**
    * bodyの取得
    * Box2Dの処理を各自行いたい時に取得する
    */
    getBody: function () {
        return this.body;
    }

});

/**
* @scope enchant.PhyBoxSprite.prototype
*/
enchant.PhyBoxSprite = enchant.Class.create(enchant.PhySprite, {
    /**
    * 四角形の物理シミュレーション用Sprite
    * @example
    *   var bear = new PhyBoxSprite(32, 32, DYNAMIC_SPRITE, 1.0, 0.5, 0.3, true);
    *   bear.image = game.assets['chara1.gif'];
    * 
    * @param {Number} [width] Spriteの横幅.
    * @param {Number} [height] Spriteの高さ.
    * @param {Boolean} [type] 静的,動的,キネマティック
    * @param {Number} [density] Spriteの密度.
    * @param {Number} [friction] Spriteの摩擦.
    * @param {Number} [restitution] Spriteの反発.
    * @param {Boolean}   [isSleeping] Spriteが初めから物理演算を行うか.
    * @constructs
    * @extends enchant.PhySprite
    */
    initialize: function (width, height, type, density, friction, restitution, isSleeping) {
        enchant.PhySprite.call(this, width, height);

        //物理オブジェクトの生成
        this.body = this.createPhyBox(type, density, friction, restitution, isSleeping);
    }
});


/**
* @scope enchant.PhyCircleSprite.prototype
*/
enchant.PhyCircleSprite = enchant.Class.create(enchant.PhySprite, {
    /**
    * 円の物理シミュレーション用Sprite
    * @example
    *   var bear = new PhyCircleSprite(16, DYNAMIC_SPRITE, 1.0, 0.5, 0.3, true);
    *   bear.image = game.assets['chara1.gif'];
    * 
    @param {Number} [radius] Spriteの半径.
    * @param {Boolean} [type] 静的,動的,キネマティック
    * @param {Number} [density] Spriteの密度.
    * @param {Number} [friction] Spriteの摩擦.
    * @param {Number} [restitution] Spriteの反発.
    * @param {Boolean}   [isSleeping] Spriteが初めから物理演算を行うか.
    * @constructs
    * @extends enchant.PhySprite
    */
    initialize: function (radius, type, density, friction, restitution, isSleeping) {
        enchant.PhySprite.call(this, radius * 2, radius * 2);

        //物理オブジェクトの生成
        this.body = this.createPhyCircle(type, density, friction, restitution, isSleeping);
    }
});













